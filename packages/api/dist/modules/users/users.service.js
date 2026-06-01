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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(role, page = 1, limit = 20) {
        const where = role ? { role } : {};
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    avatarUrl: true,
                    createdAt: true,
                    orcidProfile: { select: { orcidId: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: users.map((u) => ({
                ...u,
                orcidId: u.orcidProfile?.orcidId,
                orcidProfile: undefined,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                avatarUrl: true,
                createdAt: true,
                orcidProfile: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return user;
    }
    async updateExpoPushToken(userId, expoPushToken) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { expoPushToken },
        });
    }
    async toggleActive(id) {
        const user = await this.findById(id);
        return this.prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive },
        });
    }
    // ─── ORCID Integration ─────────────────────────────────────
    async getOrcidProfile(userId) {
        const profile = await this.prisma.orcidProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            return null;
        return {
            ...profile,
            keywords: profile.keywords ? JSON.parse(profile.keywords) : [],
            works: profile.works ? JSON.parse(profile.works) : [],
        };
    }
    async syncOrcidProfile(userId, orcidId) {
        // Validate ORCID format
        const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
        if (!orcidRegex.test(orcidId)) {
            throw new common_1.BadRequestException('Formato de ORCID inválido. Debe ser XXXX-XXXX-XXXX-XXXX');
        }
        try {
            // Fetch ORCID public record
            const recordResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/record`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!recordResponse.ok) {
                throw new Error(`ORCID API returned ${recordResponse.status}`);
            }
            const record = await recordResponse.json();
            // Extract name
            const person = record.person || {};
            const nameData = person.name || {};
            const displayName = [
                nameData?.['given-names']?.value,
                nameData?.['family-name']?.value,
            ].filter(Boolean).join(' ') || 'Investigador ORCID';
            // Extract biography
            const biography = person.biography?.content || null;
            // Extract keywords
            const keywordsArr = (person.keywords?.keyword || []).map((k) => k.content);
            // Fetch works
            const worksResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
                headers: { 'Accept': 'application/json' },
            });
            let works = [];
            if (worksResponse.ok) {
                const worksData = await worksResponse.json();
                const groups = worksData.group || [];
                works = groups.map((group) => {
                    const summary = group?.['work-summary']?.[0];
                    if (!summary)
                        return null;
                    const title = summary.title?.title?.value || 'Sin título';
                    const journalTitle = summary?.['journal-title']?.value || null;
                    const publicationYear = summary?.['publication-date']?.year?.value || null;
                    const type = summary.type || 'OTHER';
                    // Extract DOI from external IDs
                    const externalIds = summary?.['external-ids']?.['external-id'] || [];
                    const doiEntry = externalIds.find((eid) => eid['external-id-type'] === 'doi');
                    const doi = doiEntry?.['external-id-value'] || null;
                    return {
                        title,
                        journalTitle,
                        publicationYear,
                        type,
                        doi,
                        url: doi ? `https://doi.org/${doi}` : null,
                    };
                }).filter(Boolean);
            }
            // Upsert profile in database
            const profile = await this.prisma.orcidProfile.upsert({
                where: { userId },
                update: {
                    orcidId,
                    displayName,
                    biography,
                    keywords: JSON.stringify(keywordsArr),
                    works: JSON.stringify(works),
                    lastSyncAt: new Date(),
                },
                create: {
                    userId,
                    orcidId,
                    displayName,
                    biography,
                    keywords: JSON.stringify(keywordsArr),
                    works: JSON.stringify(works),
                    lastSyncAt: new Date(),
                },
            });
            return {
                ...profile,
                keywords: keywordsArr,
                works,
            };
        }
        catch (error) {
            // If ORCID API fails, still save the ORCID ID with empty data
            console.error('Error fetching ORCID data:', error.message);
            const profile = await this.prisma.orcidProfile.upsert({
                where: { userId },
                update: {
                    orcidId,
                    lastSyncAt: new Date(),
                },
                create: {
                    userId,
                    orcidId,
                    displayName: 'Investigador',
                    works: JSON.stringify([]),
                    keywords: JSON.stringify([]),
                    lastSyncAt: new Date(),
                },
            });
            return {
                ...profile,
                keywords: [],
                works: [],
                syncError: error.message,
            };
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map