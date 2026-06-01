"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const minio_service_1 = require("../storage/minio.service");
const shared_1 = require("@revisor-tesis/shared");
const pdfParse = require('pdf-parse');
const mammoth = __importStar(require("mammoth"));
let DocumentsService = class DocumentsService {
    prisma;
    minio;
    embeddingsQueue;
    notificationsQueue;
    constructor(prisma, minio, embeddingsQueue, notificationsQueue) {
        this.prisma = prisma;
        this.minio = minio;
        this.embeddingsQueue = embeddingsQueue;
        this.notificationsQueue = notificationsQueue;
    }
    async uploadDocument(projectId, file) {
        // Validar tipo de archivo
        if (!shared_1.FILE_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Tipo de archivo no permitido. Permitidos: ${shared_1.FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`);
        }
        // Validar tamaño
        if (file.size > shared_1.FILE_CONFIG.MAX_FILE_SIZE) {
            throw new common_1.BadRequestException('El archivo excede el tamaño máximo de 50MB');
        }
        // Verificar que el proyecto existe
        const project = await this.prisma.thesisProject.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('Proyecto no encontrado');
        // Subir a MinIO
        const fileKey = await this.minio.uploadDocument(file.originalname, file.buffer, file.mimetype);
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
            await this.embeddingsQueue.add('process-embeddings', {
                submissionId: submission.id,
                projectId,
                text: extractedText,
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            });
        }
        catch (error) {
            await this.prisma.documentSubmission.update({
                where: { id: submission.id },
                data: { status: 'ERROR' },
            });
            throw new common_1.BadRequestException(`Error extrayendo texto: ${error.message}`);
        }
        return submission;
    }
    async findByProject(projectId, page = 1, limit = 20) {
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
    async findById(id) {
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
        if (!submission)
            throw new common_1.NotFoundException('Documento no encontrado');
        return submission;
    }
    async approveReject(submissionId, advisorId, approved, comment) {
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
    async getDownloadUrl(id) {
        const submission = await this.prisma.documentSubmission.findUnique({
            where: { id },
            select: { fileKey: true },
        });
        if (!submission)
            throw new common_1.NotFoundException('Documento no encontrado');
        return this.minio.getPresignedUrl(submission.fileKey);
    }
    // ─── Extracción de texto ──────────────────────────────────
    async extractText(buffer, mimeType) {
        if (mimeType === 'application/pdf') {
            const data = await pdfParse(buffer);
            return data.text;
        }
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword') {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        }
        throw new common_1.BadRequestException('Tipo de archivo no soportado para extracción de texto');
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(shared_1.QUEUES.EMBEDDINGS)),
    __param(3, (0, bullmq_1.InjectQueue)(shared_1.QUEUES.NOTIFICATIONS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        minio_service_1.MinioService,
        bullmq_2.Queue,
        bullmq_2.Queue])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map