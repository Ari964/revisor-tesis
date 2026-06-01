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
exports.ThesisService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ThesisService = class ThesisService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(studentId, data) {
        return this.prisma.thesisProject.create({
            data: {
                title: data.title,
                description: data.description,
                researchLine: data.researchLine,
                studentId,
                advisorId: data.advisorId,
                patternId: data.patternId,
                nextDeadline: data.nextDeadline ? new Date(data.nextDeadline) : undefined,
            },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, email: true } },
                advisor: { select: { id: true, firstName: true, lastName: true, email: true } },
                pattern: { select: { id: true, name: true } },
            },
        });
    }
    async findAll(userId, userRole, page = 1, limit = 20) {
        const where = { isActive: true };
        // Filtrar según rol
        if (userRole === 'STUDENT') {
            where.studentId = userId;
        }
        else if (userRole === 'ADVISOR') {
            where.advisorId = userId;
        }
        else if (userRole === 'COORDINATOR') {
            where.coordinatorId = userId;
        }
        // ADMIN ve todos
        const [projects, total] = await Promise.all([
            this.prisma.thesisProject.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    student: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                    advisor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                    pattern: { select: { id: true, name: true } },
                    _count: { select: { submissions: true } },
                },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.thesisProject.count({ where }),
        ]);
        return {
            data: projects.map((p) => ({
                ...p,
                submissionCount: p._count.submissions,
                _count: undefined,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findById(id, userId, userRole) {
        const project = await this.prisma.thesisProject.findUnique({
            where: { id },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                advisor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                coordinator: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                pattern: true,
                submissions: {
                    orderBy: { submittedAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        fileName: true,
                        status: true,
                        overallScore: true,
                        submittedAt: true,
                        advisorApproved: true,
                    },
                },
            },
        });
        if (!project)
            throw new common_1.NotFoundException('Proyecto no encontrado');
        // Verificar acceso
        if (userRole !== 'ADMIN' &&
            userRole !== 'COORDINATOR' &&
            project.studentId !== userId &&
            project.advisorId !== userId) {
            throw new common_1.ForbiddenException('No tiene acceso a este proyecto');
        }
        return project;
    }
    async update(id, userId, userRole, data) {
        await this.findById(id, userId, userRole); // Verifica existencia y acceso
        return this.prisma.thesisProject.update({
            where: { id },
            data: {
                ...data,
                nextDeadline: data.nextDeadline ? new Date(data.nextDeadline) : undefined,
            },
        });
    }
};
exports.ThesisService = ThesisService;
exports.ThesisService = ThesisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ThesisService);
//# sourceMappingURL=thesis.service.js.map