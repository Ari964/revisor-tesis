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
exports.GeneratorController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const generator_service_1 = require("./generator.service");
let GeneratorController = class GeneratorController {
    generatorService;
    constructor(generatorService) {
        this.generatorService = generatorService;
    }
    async initThesis(body) {
        if (!body.tema) {
            throw new common_1.BadRequestException('El campo tema es obligatorio.');
        }
        const data = await this.generatorService.initThesis(body.tema, body.metadata || {});
        return { success: true, data };
    }
    async generateStep(body) {
        const { stepIndex, currentData } = body;
        if (stepIndex === undefined || !currentData) {
            throw new common_1.BadRequestException('Los campos stepIndex y currentData son obligatorios.');
        }
        const data = await this.generatorService.generateStep(stepIndex, currentData);
        return { success: true, data };
    }
    async exportThesis(body, res) {
        const { thesisData, format } = body;
        if (!thesisData || !format) {
            throw new common_1.BadRequestException('Los campos thesisData y format son obligatorios.');
        }
        const fmt = format.toLowerCase();
        if (!['docx', 'pdf', 'txt'].includes(fmt)) {
            throw new common_1.BadRequestException('Formato no soportado. Debe ser docx, pdf o txt.');
        }
        const buffer = await this.generatorService.exportThesis(thesisData, fmt);
        let contentType = 'text/plain';
        let fileName = `tesis_borrador.${fmt}`;
        if (fmt === 'docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        else if (fmt === 'pdf') {
            contentType = 'application/pdf';
        }
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
};
exports.GeneratorController = GeneratorController;
__decorate([
    (0, common_1.Post)('init'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GeneratorController.prototype, "initThesis", null);
__decorate([
    (0, common_1.Post)('generate-step'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GeneratorController.prototype, "generateStep", null);
__decorate([
    (0, common_1.Post)('export'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GeneratorController.prototype, "exportThesis", null);
exports.GeneratorController = GeneratorController = __decorate([
    (0, common_1.Controller)('generator'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [generator_service_1.GeneratorService])
], GeneratorController);
//# sourceMappingURL=generator.controller.js.map