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
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let FeedbackService = class FeedbackService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createFeedback(advisorId, data) {
        // Obtener el hallazgo original
        const finding = await this.prisma.aiReviewFinding.findUnique({
            where: { id: data.findingId },
        });
        if (!finding)
            throw new common_1.NotFoundException('Hallazgo no encontrado');
        return this.prisma.feedbackCorrection.create({
            data: {
                findingId: data.findingId,
                advisorId,
                originalSeverity: finding.severity,
                correctedSeverity: data.correctedSeverity,
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
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map