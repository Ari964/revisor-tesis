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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const review_service_1 = require("./review.service");
const feedback_service_1 = require("./feedback.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ReviewController = class ReviewController {
    reviewService;
    feedbackService;
    constructor(reviewService, feedbackService) {
        this.reviewService = reviewService;
        this.feedbackService = feedbackService;
    }
    async getFindings(submissionId) {
        const findings = await this.reviewService.getFindingsBySubmission(submissionId);
        return { success: true, data: findings };
    }
    async getFinding(id) {
        const finding = await this.reviewService.getFindingById(id);
        return { success: true, data: finding };
    }
    async getJobStatus(submissionId) {
        const jobs = await this.reviewService.getJobStatus(submissionId);
        return { success: true, data: jobs };
    }
    async resolveFinding(id) {
        const finding = await this.reviewService.markFindingResolved(id);
        return { success: true, data: finding };
    }
    async createFeedback(advisorId, body) {
        const feedback = await this.feedbackService.createFeedback(advisorId, body);
        return { success: true, data: feedback };
    }
    async getFeedbackStats() {
        const stats = await this.feedbackService.getFeedbackStats();
        return { success: true, data: stats };
    }
};
exports.ReviewController = ReviewController;
__decorate([
    (0, common_1.Get)('findings/:submissionId'),
    __param(0, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getFindings", null);
__decorate([
    (0, common_1.Get)('finding/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getFinding", null);
__decorate([
    (0, common_1.Get)('jobs/:submissionId'),
    __param(0, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Patch)('finding/:id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "resolveFinding", null);
__decorate([
    (0, common_1.Post)('feedback'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADVISOR', 'COORDINATOR', 'ADMIN'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "createFeedback", null);
__decorate([
    (0, common_1.Get)('feedback/stats'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'COORDINATOR'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getFeedbackStats", null);
exports.ReviewController = ReviewController = __decorate([
    (0, common_1.Controller)('review'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [review_service_1.ReviewService,
        feedback_service_1.FeedbackService])
], ReviewController);
//# sourceMappingURL=review.controller.js.map