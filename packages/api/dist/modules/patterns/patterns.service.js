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
exports.PatternsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PatternsService = class PatternsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        // Si es default, quitar el default anterior
        if (data.isDefault) {
            await this.prisma.documentPattern.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }
        return this.prisma.documentPattern.create({
            data: {
                name: data.name,
                description: data.description,
                version: data.version || '1.0',
                structure: JSON.stringify(data.structure),
                isDefault: data.isDefault || false,
            },
        });
    }
    async findAll() {
        const patterns = await this.prisma.documentPattern.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return patterns.map((p) => ({
            ...p,
            structure: JSON.parse(p.structure),
        }));
    }
    async findById(id) {
        const pattern = await this.prisma.documentPattern.findUnique({ where: { id } });
        if (!pattern)
            throw new common_1.NotFoundException('Patrón no encontrado');
        return { ...pattern, structure: JSON.parse(pattern.structure) };
    }
    async update(id, data) {
        await this.findById(id);
        return this.prisma.documentPattern.update({
            where: { id },
            data: {
                ...data,
                structure: data.structure ? JSON.stringify(data.structure) : undefined,
            },
        });
    }
    async getDefault() {
        const pattern = await this.prisma.documentPattern.findFirst({
            where: { isDefault: true },
        });
        if (!pattern)
            throw new common_1.NotFoundException('No hay patrón por defecto configurado');
        return { ...pattern, structure: JSON.parse(pattern.structure) };
    }
};
exports.PatternsService = PatternsService;
exports.PatternsService = PatternsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PatternsService);
//# sourceMappingURL=patterns.service.js.map