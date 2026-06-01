import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(user: any): Promise<{
        success: boolean;
        data: {
            totalProjects: number;
            activeProjects: number;
            totalSubmissions: number;
            pendingReviews: number;
            completedReviews: number;
            averageScore: number;
            plagiarismAlerts: number;
            verifiedCitations: number;
        };
    }>;
    getTimeline(user: any, days?: number): Promise<{
        success: boolean;
        data: {
            submissions: number;
            reviews: number;
            date: string;
        }[];
    }>;
    getSeverityDistribution(user: any): Promise<{
        success: boolean;
        data: {
            severity: import(".prisma/client").$Enums.FindingSeverity;
            count: number;
        }[];
    }>;
}
//# sourceMappingURL=dashboard.controller.d.ts.map