import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CitationsService {
  constructor(private prisma: PrismaService) {}

  async getBySubmission(submissionId: string) {
    return this.prisma.citationValidation.findMany({
      where: { submissionId },
      orderBy: { status: 'asc' },
    });
  }

  async getStats(submissionId: string) {
    const [verified, partial, notFound, pending] = await Promise.all([
      this.prisma.citationValidation.count({ where: { submissionId, status: 'VERIFIED' } }),
      this.prisma.citationValidation.count({ where: { submissionId, status: 'PARTIAL' } }),
      this.prisma.citationValidation.count({ where: { submissionId, status: 'NOT_FOUND' } }),
      this.prisma.citationValidation.count({ where: { submissionId, status: 'PENDING' } }),
    ]);

    return { verified, partial, notFound, pending, total: verified + partial + notFound + pending };
  }
}
