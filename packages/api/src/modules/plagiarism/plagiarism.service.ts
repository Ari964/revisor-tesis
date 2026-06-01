import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PlagiarismService {
  constructor(private prisma: PrismaService) {}

  async getAlertsBySubmission(submissionId: string) {
    return this.prisma.plagiarismAlert.findMany({
      where: { submissionId },
      orderBy: { similarityScore: 'desc' },
    });
  }

  async getAllAlerts(page = 1, limit = 20) {
    const [alerts, total] = await Promise.all([
      this.prisma.plagiarismAlert.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          submission: {
            select: {
              id: true,
              fileName: true,
              project: { select: { title: true, student: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plagiarismAlert.count(),
    ]);

    return {
      data: alerts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewAlert(id: string, comment: string) {
    return this.prisma.plagiarismAlert.update({
      where: { id },
      data: { isReviewed: true, reviewerComment: comment },
    });
  }
}
