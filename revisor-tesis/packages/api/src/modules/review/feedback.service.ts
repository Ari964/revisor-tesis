import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async createFeedback(advisorId: string, data: {
    findingId: string;
    wasAccepted: boolean;
    correctedSeverity?: string;
    correctedDescription?: string;
    correctedInstruction?: string;
    advisorNotes?: string;
  }) {
    // Obtener el hallazgo original
    const finding = await this.prisma.aiReviewFinding.findUnique({
      where: { id: data.findingId },
    });
    if (!finding) throw new NotFoundException('Hallazgo no encontrado');

    return this.prisma.feedbackCorrection.create({
      data: {
        findingId: data.findingId,
        advisorId,
        originalSeverity: finding.severity,
        correctedSeverity: data.correctedSeverity as any,
        originalDescription: finding.description,
        correctedDescription: data.correctedDescription,
        originalInstruction: finding.instruction,
        correctedInstruction: data.correctedInstruction,
        wasAccepted: data.wasAccepted,
        advisorNotes: data.advisorNotes,
      },
    });
  }

  async getFeedbackStats() {
    const [total, accepted, rejected] = await Promise.all([
      this.prisma.feedbackCorrection.count(),
      this.prisma.feedbackCorrection.count({ where: { wasAccepted: true } }),
      this.prisma.feedbackCorrection.count({ where: { wasAccepted: false } }),
    ]);

    return {
      total,
      accepted,
      rejected,
      acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
    };
  }
}
