import { PrismaService } from '../../common/prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(userId: string, userRole: string): Promise<{
        totalProjects: number;
        activeProjects: number;
        totalSubmissions: number;
        pendingReviews: number;
        completedReviews: number;
        averageScore: number;
        plagiarismAlerts: number;
        verifiedCitations: number;
    }>;
    getReviewTimeline(userId: string, userRole: string, days?: number): Promise<{
        submissions: number;
        reviews: number;
        date: string;
    }[]>;
    getSeverityDistribution(userId: string, userRole: string): Promise<{
        severity: import(".prisma/client").$Enums.FindingSeverity;
        count: number;
    }[]>;
}
//# sourceMappingURL=dashboard.service.d.ts.map