import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: UserRole, page = 1, limit = 20) {
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
          academicDegree: true,
          institution: true,
          orcid: true,
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
        orcidId: u.orcidProfile?.orcidId || u.orcid,
        orcidProfile: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
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
        academicDegree: true,
        institution: true,
        orcid: true,
        createdAt: true,
        orcidProfile: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    academicDegree?: string;
    institution?: string;
    orcid?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException('El correo ya está registrado');
    }

    // Hash a random password because they won't use standard password login initially
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        academicDegree: data.academicDegree || null,
        institution: data.institution || null,
        orcid: data.orcid || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        academicDegree: true,
        institution: true,
        orcid: true,
        createdAt: true,
      }
    });
  }

  async update(
    id: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
      academicDegree?: string;
      institution?: string;
      orcid?: string;
    },
  ) {
    await this.findById(id);

    if (data.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El correo ya está registrado por otro usuario');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        academicDegree: data.academicDegree !== undefined ? data.academicDegree : undefined,
        institution: data.institution !== undefined ? data.institution : undefined,
        orcid: data.orcid !== undefined ? data.orcid : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        academicDegree: true,
        institution: true,
        orcid: true,
        createdAt: true,
      }
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async updateExpoPushToken(userId: string, expoPushToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });
  }

  async toggleActive(id: string) {
    const user = await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }

  // ─── ORCID Integration ─────────────────────────────────────

  async getOrcidProfile(userId: string) {
    const profile = await this.prisma.orcidProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;

    return {
      ...profile,
      keywords: profile.keywords ? JSON.parse(profile.keywords) : [],
      works: profile.works ? JSON.parse(profile.works) : [],
    };
  }

  async syncOrcidProfile(userId: string, orcidId: string) {
    // Validate ORCID format
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    if (!orcidRegex.test(orcidId)) {
      throw new BadRequestException('Formato de ORCID inválido. Debe ser XXXX-XXXX-XXXX-XXXX');
    }

    try {
      // Fetch ORCID public record
      const recordResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/record`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!recordResponse.ok) {
        throw new Error(`ORCID API returned ${recordResponse.status}`);
      }

      const record: any = await recordResponse.json();

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
      const keywordsArr = (person.keywords?.keyword || []).map((k: any) => k.content);

      // Fetch works
      const worksResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
        headers: { 'Accept': 'application/json' },
      });

      let works: any[] = [];
      if (worksResponse.ok) {
        const worksData: any = await worksResponse.json();
        const groups = worksData.group || [];

        works = groups.map((group: any) => {
          const summary = group?.['work-summary']?.[0];
          if (!summary) return null;

          const title = summary.title?.title?.value || 'Sin título';
          const journalTitle = summary?.['journal-title']?.value || null;
          const publicationYear = summary?.['publication-date']?.year?.value || null;
          const type = summary.type || 'OTHER';

          // Extract DOI from external IDs
          const externalIds = summary?.['external-ids']?.['external-id'] || [];
          const doiEntry = externalIds.find((eid: any) => eid['external-id-type'] === 'doi');
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

    } catch (error: any) {
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
}
