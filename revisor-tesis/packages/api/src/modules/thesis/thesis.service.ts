import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ThesisService {
  constructor(private prisma: PrismaService) {}

  async create(studentId: string, data: {
    title: string;
    description?: string;
    researchLine?: string;
    advisorId?: string;
    patternId?: string;
    nextDeadline?: string;
  }) {
    return this.prisma.thesisProject.create({
      data: {
        title: data.title,
        description: data.description,
        researchLine: data.researchLine,
        studentId,
        advisorId: data.advisorId,
        patternId: data.patternId,
        nextDeadline: data.nextDeadline ? new Date(data.nextDeadline) : undefined,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        advisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        pattern: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(userId: string, userRole: string, page = 1, limit = 20) {
    const where: any = { isActive: true };

    // Filtrar según rol
    if (userRole === 'STUDENT') {
      where.studentId = userId;
    } else if (userRole === 'ADVISOR') {
      where.advisorId = userId;
    } else if (userRole === 'COORDINATOR') {
      where.coordinatorId = userId;
    }
    // ADMIN ve todos

    const [projects, total] = await Promise.all([
      this.prisma.thesisProject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          advisor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          pattern: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.thesisProject.count({ where }),
    ]);

    return {
      data: projects.map((p) => ({
        ...p,
        submissionCount: p._count.submissions,
        _count: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, userId: string, userRole: string) {
    const project = await this.prisma.thesisProject.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        advisor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        coordinator: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        pattern: true,
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            fileName: true,
            status: true,
            overallScore: true,
            submittedAt: true,
            advisorApproved: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    // Verificar acceso
    if (
      userRole !== 'ADMIN' &&
      userRole !== 'COORDINATOR' &&
      project.studentId !== userId &&
      project.advisorId !== userId
    ) {
      throw new ForbiddenException('No tiene acceso a este proyecto');
    }

    return project;
  }

  async update(id: string, userId: string, userRole: string, data: {
    title?: string;
    description?: string;
    researchLine?: string;
    advisorId?: string;
    patternId?: string;
    currentPhase?: string;
    nextDeadline?: string;
  }) {
    await this.findById(id, userId, userRole); // Verifica existencia y acceso

    return this.prisma.thesisProject.update({
      where: { id },
      data: {
        ...data,
        nextDeadline: data.nextDeadline ? new Date(data.nextDeadline) : undefined,
      },
    });
  }
}
