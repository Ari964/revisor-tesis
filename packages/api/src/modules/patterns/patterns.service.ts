import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatternsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; description?: string; version?: string; structure: any; isDefault?: boolean }) {
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

  async findById(id: string) {
    const pattern = await this.prisma.documentPattern.findUnique({ where: { id } });
    if (!pattern) throw new NotFoundException('Patrón no encontrado');
    return { ...pattern, structure: JSON.parse(pattern.structure) };
  }

  async update(id: string, data: Partial<{ name: string; description: string; version: string; structure: any; isDefault: boolean }>) {
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
    if (!pattern) throw new NotFoundException('No hay patrón por defecto configurado');
    return { ...pattern, structure: JSON.parse(pattern.structure) };
  }
}
