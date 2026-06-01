"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(userId, userRole) {
        const projectWhere = {};
        if (userRole === 'STUDENT')
            projectWhere.studentId = userId;
        else if (userRole === 'ADVISOR')
            projectWhere.advisorId = userId;
        const [totalProjects, activeProjects, totalSubmissions, pendingReviews, completedReviews, plagiarismAlerts, verifiedCitations,] = await Promise.all([
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
    async getReviewTimeline(userId, userRole, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const projectWhere = {};
        if (userRole === 'STUDENT')
            projectWhere.studentId = userId;
        else if (userRole === 'ADVISOR')
            projectWhere.advisorId = userId;
        const submissions = await this.prisma.documentSubmission.findMany({
            where: {
                project: projectWhere,
                submittedAt: { gte: startDate },
            },
            select: { submittedAt: true, status: true },
            orderBy: { submittedAt: 'asc' },
        });
        // Agrupar por día
        const timeline = {};
        submissions.forEach((s) => {
            const date = s.submittedAt.toISOString().split('T')[0];
            if (!timeline[date])
                timeline[date] = { submissions: 0, reviews: 0 };
            timeline[date].submissions++;
            if (s.status === 'REVIEWED')
                timeline[date].reviews++;
        });
        return Object.entries(timeline).map(([date, data]) => ({
            date,
            ...data,
        }));
    }
    async getSeverityDistribution(userId, userRole) {
        const projectWhere = {};
        if (userRole === 'STUDENT')
            projectWhere.studentId = userId;
        else if (userRole === 'ADVISOR')
            projectWhere.advisorId = userId;
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map