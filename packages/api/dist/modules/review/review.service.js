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
exports.ReviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ReviewService = class ReviewService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFindingsBySubmission(submissionId) {
        return this.prisma.aiReviewFinding.findMany({
            where: { submissionId },
            include: { feedbackCorrection: true },
            orderBy: [{ severity: 'asc' }, { category: 'asc' }],
        });
    }
    async getFindingById(id) {
        return this.prisma.aiReviewFinding.findUnique({
            where: { id },
            include: { feedbackCorrection: true },
        });
    }
    async getJobStatus(submissionId) {
        return this.prisma.aiReviewJob.findMany({
            where: { submissionId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async markFindingResolved(id) {
        return this.prisma.aiReviewFinding.update({
            where: { id },
            data: { isResolved: true },
        });
    }
};
exports.ReviewService = ReviewService;
exports.ReviewService = ReviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewService);
//# sourceMappingURL=review.service.js.map