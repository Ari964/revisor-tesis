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
exports.CitationsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const citations_service_1 = require("./citations.service");
let CitationsController = class CitationsController {
    citationsService;
    constructor(citationsService) {
        this.citationsService = citationsService;
    }
    async getBySubmission(submissionId) {
        const citations = await this.citationsService.getBySubmission(submissionId);
        return { success: true, data: citations };
    }
    async getStats(submissionId) {
        const stats = await this.citationsService.getStats(submissionId);
        return { success: true, data: stats };
    }
};
exports.CitationsController = CitationsController;
__decorate([
    (0, common_1.Get)('submission/:submissionId'),
    __param(0, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CitationsController.prototype, "getBySubmission", null);
__decorate([
    (0, common_1.Get)('stats/:submissionId'),
    __param(0, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CitationsController.prototype, "getStats", null);
exports.CitationsController = CitationsController = __decorate([
    (0, common_1.Controller)('citations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [citations_service_1.CitationsService])
], CitationsController);
//# sourceMappingURL=citations.controller.js.map