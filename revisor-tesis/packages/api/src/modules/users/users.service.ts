import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

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
        createdAt: true,
        orcidProfile: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
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

  async syncOrcidProfile(userId: string, orcidId: string) {
    const cleanOrcidId = orcidId.trim();
    
    // Validar formato de ORCID (0000-0002-1825-0097 o similar)
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    if (!orcidRegex.test(cleanOrcidId)) {
      throw new Error('El ID de ORCID proporcionado no es válido. Debe tener el formato XXXX-XXXX-XXXX-XXXX');
    }

    try {
      const response = await fetch(`https://pub.orcid.org/v3.0/${cleanOrcidId}/record`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error al consultar ORCID (Código: ${response.status})`);
      }

      const data: any = await response.json();
      
      // Parsear datos
      const person = data.person || {};
      const givenNames = person.name?.['given-names']?.value || '';
      const familyName = person.name?.['family-name']?.value || '';
      const displayName = person.name?.['credit-name']?.value || `${givenNames} ${familyName}`.trim() || 'Asesor Registrado';
      const biography = person.biography?.content || '';

      const keywordsList = person.keywords?.keyword || [];
      const keywords = keywordsList.map((k: any) => k.value).filter(Boolean);

      const worksGroupList = data['activities-summary']?.works?.group || [];
      const works = worksGroupList.map((g: any) => {
        const summary = g['work-summary']?.[0];
        if (!summary) return null;
        
        const title = summary.title?.title?.value || 'Sin título';
        const journal = summary['journal-title']?.value || '';
        const year = summary['publication-date']?.year?.value || '';
        const type = summary.type || '';
        const url = summary.url?.value || '';
        
        return { title, journal, year, type, url };
      }).filter(Boolean);

      // Guardar en la BD
      const updatedProfile = await this.prisma.orcidProfile.upsert({
        where: { userId },
        update: {
          orcidId: cleanOrcidId,
          displayName,
          biography,
          keywords: JSON.stringify(keywords),
          works: JSON.stringify(works),
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          orcidId: cleanOrcidId,
          displayName,
          biography,
          keywords: JSON.stringify(keywords),
          works: JSON.stringify(works),
          lastSyncAt: new Date(),
        },
      });

      return updatedProfile;
    } catch (error: any) {
      console.error('Error syncing ORCID profile:', error);
      throw new Error(error.message || 'Error de conexión con los servidores de ORCID. Intente más tarde.');
    }
  }

  async unlinkOrcidProfile(userId: string) {
    return this.prisma.orcidProfile.deleteMany({
      where: { userId },
    });
  }
}
