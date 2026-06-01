import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async getFindingsBySubmission(submissionId: string) {
    return this.prisma.aiReviewFinding.findMany({
      where: { submissionId },
      include: { feedbackCorrection: true },
      orderBy: [{ severity: 'asc' }, { category: 'asc' }],
    });
  }

  async getFindingById(id: string) {
    return this.prisma.aiReviewFinding.findUnique({
      where: { id },
      include: { feedbackCorrection: true },
    });
  }

  async getJobStatus(submissionId: string) {
    return this.prisma.aiReviewJob.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markFindingResolved(id: string) {
    return this.prisma.aiReviewFinding.update({
      where: { id },
      data: { isResolved: true },
    });
  }
}
