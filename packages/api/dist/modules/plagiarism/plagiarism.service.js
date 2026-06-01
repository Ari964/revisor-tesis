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
exports.PlagiarismService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PlagiarismService = class PlagiarismService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAlertsBySubmission(submissionId) {
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
    async reviewAlert(id, comment) {
        return this.prisma.plagiarismAlert.update({
            where: { id },
            data: { isReviewed: true, reviewerComment: comment },
        });
    }
};
exports.PlagiarismService = PlagiarismService;
exports.PlagiarismService = PlagiarismService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlagiarismService);
//# sourceMappingURL=plagiarism.service.js.map