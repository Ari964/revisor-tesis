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
exports.PlagiarismController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const plagiarism_service_1 = require("./plagiarism.service");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let PlagiarismController = class PlagiarismController {
    plagiarismService;
    constructor(plagiarismService) {
        this.plagiarismService = plagiarismService;
    }
    async getBySubmission(submissionId) {
        const alerts = await this.plagiarismService.getAlertsBySubmission(submissionId);
        return { success: true, data: alerts };
    }
    async getAll(page, limit) {
        const result = await this.plagiarismService.getAllAlerts(page, limit);
        return { success: true, ...result };
    }
    async review(id, comment) {
        const alert = await this.plagiarismService.reviewAlert(id, comment);
        return { success: true, data: alert };
    }
};
exports.PlagiarismController = PlagiarismController;
__decorate([
    (0, common_1.Get)('submission/:submissionId'),
    __param(0, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlagiarismController.prototype, "getBySubmission", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'COORDINATOR', 'ADVISOR'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PlagiarismController.prototype, "getAll", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'COORDINATOR', 'ADVISOR'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('comment')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlagiarismController.prototype, "review", null);
exports.PlagiarismController = PlagiarismController = __decorate([
    (0, common_1.Controller)('plagiarism'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [plagiarism_service_1.PlagiarismService])
], PlagiarismController);
//# sourceMappingURL=plagiarism.controller.js.map