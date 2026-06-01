import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, userRole: string) {
    const projectWhere: any = {};
    if (userRole === 'STUDENT') projectWhere.studentId = userId;
    else if (userRole === 'ADVISOR') projectWhere.advisorId = userId;

    const [
      totalProjects,
      activeProjects,
      totalSubmissions,
      pendingReviews,
      completedReviews,
      plagiarismAlerts,
      verifiedCitations,
    ] = await Promise.all([
      this.prisma.thesisProject.count({ where: projectWhere }),
      this.prisma.thesisProject.count({ where: { ...projectWhere, isActive: true } }),
      this.prisma.documentSubmission.count({
        where: { project: projectWhere },
      }),
      this.prisma.documentSubmission.count({
        where: { project: projectWhere, status: { in: ['UPLOADED', 'EXTRACTING', 'VECTORIZING', 'ANALYZING'] } },
      }),
      this.prisma.documentSubmission.count({
        where: { project: projectWhere, status: 'REVIEWED' },
      }),
      this.prisma.plagiarismAlert.count({
        where: { submission: { project: projectWhere }, isReviewed: false },
      }),
      this.prisma.citationValidation.count({
        where: { submission: { project: projectWhere }, status: 'VERIFIED' },
      }),
    ]);

    // Calcular promedio de notas
    const scores = await this.prisma.documentSubmission.aggregate({
      where: { project: projectWhere, overallScore: { not: null } },
      _avg: { overallScore: true },
    });

    return {
      totalProjects,
      activeProjects,
      totalSubmissions,
      pendingReviews,
      completedReviews,
      averageScore: scores._avg.overallScore || 0,
      plagiarismAlerts,
      verifiedCitations,
    };
  }

  async getReviewTimeline(userId: string, userRole: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const projectWhere: any = {};
    if (userRole === 'STUDENT') projectWhere.studentId = userId;
    else if (userRole === 'ADVISOR') projectWhere.advisorId = userId;

    const submissions = await this.prisma.documentSubmission.findMany({
      where: {
        project: projectWhere,
        submittedAt: { gte: startDate },
      },
      select: { submittedAt: true, status: true },
      orderBy: { submittedAt: 'asc' },
    });

    // Agrupar por día
    const timeline: Record<string, { submissions: number; reviews: number }> = {};
    submissions.forEach((s) => {
      const date = s.submittedAt.toISOString().split('T')[0];
      if (!timeline[date]) timeline[date] = { submissions: 0, reviews: 0 };
      timeline[date].submissions++;
      if (s.status === 'REVIEWED') timeline[date].reviews++;
    });

    return Object.entries(timeline).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  async getSeverityDistribution(userId: string, userRole: string) {
    const projectWhere: any = {};
    if (userRole === 'STUDENT') projectWhere.studentId = userId;
    else if (userRole === 'ADVISOR') projectWhere.advisorId = userId;

    const findings = await this.prisma.aiReviewFinding.groupBy({
      by: ['severity'],
      where: { submission: { project: projectWhere } },
      _count: { severity: true },
    });

    return findings.map((f) => ({
      severity: f.severity,
      count: f._count.severity,
    }));
  }
}
