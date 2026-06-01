import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { QUEUES, FILE_CONFIG } from '@revisor-tesis/shared';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    @InjectQueue(QUEUES.EMBEDDINGS) private embeddingsQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  async uploadDocument(
    projectId: string,
    file: Express.Multer.File,
  ) {
    // Validar tipo de archivo
    if (!FILE_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Permitidos: ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Validar tamaño
    if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 50MB');
    }

    // Verificar que el proyecto existe
    const project = await this.prisma.thesisProject.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    // Subir a MinIO
    const fileKey = await this.minio.uploadDocument(
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    // Crear registro en BD
    const submission = await this.prisma.documentSubmission.create({
      data: {
        projectId,
        fileName: file.originalname,
        fileKey,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'EXTRACTING',
      },
    });

    // Extraer texto del documento
    try {
      const extractedText = await this.extractText(file.buffer, file.mimetype);

      await this.prisma.documentSubmission.update({
        where: { id: submission.id },
        data: {
          extractedText,
          status: 'VECTORIZING',
        },
      });

      // Crear job de revisión IA
      await this.prisma.aiReviewJob.create({
        data: {
          submissionId: submission.id,
          jobType: 'embeddings',
          status: 'PENDING',
        },
      });

      // Encolar procesamiento de embeddings
      await this.embeddingsQueue.add(
        'process-embeddings',
        {
          submissionId: submission.id,
          projectId,
          text: extractedText,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } catch (error) {
      await this.prisma.documentSubmission.update({
        where: { id: submission.id },
        data: { status: 'ERROR' },
      });
      throw new BadRequestException(`Error extrayendo texto: ${(error as Error).message}`);
    }

    return submission;
  }

  async findByProject(projectId: string, page = 1, limit = 20) {
    const [submissions, total] = await Promise.all([
      this.prisma.documentSubmission.findMany({
        where: { projectId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              findings: true,
              plagiarismAlerts: true,
              citationValidations: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.documentSubmission.count({ where: { projectId } }),
    ]);

    return {
      data: submissions.map((s) => ({
        ...s,
        findingsCount: s._count.findings,
        plagiarismAlertsCount: s._count.plagiarismAlerts,
        citationsCount: s._count.citationValidations,
        _count: undefined,
        extractedText: undefined, // No enviar texto completo en listados
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const submission = await this.prisma.documentSubmission.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, title: true, studentId: true, advisorId: true },
        },
        findings: { orderBy: { severity: 'asc' } },
        plagiarismAlerts: { orderBy: { similarityScore: 'desc' } },
        citationValidations: true,
        aiReviewJobs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!submission) throw new NotFoundException('Documento no encontrado');
    return submission;
  }

  async approveReject(
    submissionId: string,
    advisorId: string,
    approved: boolean,
    comment?: string,
  ) {
    const submission = await this.prisma.documentSubmission.update({
      where: { id: submissionId },
      data: {
        advisorApproved: approved,
        advisorComment: comment,
        reviewedAt: new Date(),
      },
      include: { project: true },
    });

    // Notificar al estudiante
    await this.notificationsQueue.add('send-notification', {
      userId: submission.project.studentId,
      type: approved ? 'ADVISOR_APPROVED' : 'ADVISOR_REJECTED',
      projectTitle: submission.project.title,
      advisorId,
    });

    return submission;
  }

  async getDownloadUrl(id: string) {
    const submission = await this.prisma.documentSubmission.findUnique({
      where: { id },
      select: { fileKey: true },
    });
    if (!submission) throw new NotFoundException('Documento no encontrado');
    return this.minio.getPresignedUrl(submission.fileKey);
  }

  // ─── Extracción de texto ──────────────────────────────────

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new BadRequestException('Tipo de archivo no soportado para extracción de texto');
  }
}
