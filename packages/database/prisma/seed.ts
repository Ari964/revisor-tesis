import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env desde la raíz
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

// Simple hash para seed (en producción se usa bcrypt desde el API)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // ─── Usuarios de prueba ─────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@universidad.edu.pe' },
    update: {},
    create: {
      email: 'admin@universidad.edu.pe',
      passwordHash: hashPassword('admin123'),
      firstName: 'Carlos',
      lastName: 'Administrador',
      role: UserRole.ADMIN,
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinador@universidad.edu.pe' },
    update: {},
    create: {
      email: 'coordinador@universidad.edu.pe',
      passwordHash: hashPassword('coord123'),
      firstName: 'María',
      lastName: 'Coordinadora',
      role: UserRole.COORDINATOR,
    },
  });

  const advisor = await prisma.user.upsert({
    where: { email: 'asesor@universidad.edu.pe' },
    update: {},
    create: {
      email: 'asesor@universidad.edu.pe',
      passwordHash: hashPassword('asesor123'),
      firstName: 'José',
      lastName: 'Asesor',
      role: UserRole.ADVISOR,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'estudiante@universidad.edu.pe' },
    update: {},
    create: {
      email: 'estudiante@universidad.edu.pe',
      passwordHash: hashPassword('estudiante123'),
      firstName: 'Ana',
      lastName: 'Estudiante',
      role: UserRole.STUDENT,
    },
  });

  // ─── Documento Patrón (Template por defecto) ────────────
  const pattern = await prisma.documentPattern.upsert({
    where: { id: 'default-pattern-001' },
    update: {},
    create: {
      id: 'default-pattern-001',
      name: 'Formato Estándar de Tesis - Universidad',
      description: 'Formato oficial para la presentación de tesis de pregrado',
      version: '1.0',
      isDefault: true,
      structure: JSON.stringify({
        formatRules: {
          font: 'Times New Roman',
          fontSize: 12,
          lineSpacing: 1.5,
          margins: { top: 2.5, bottom: 2.5, left: 3.0, right: 2.5 },
          pageNumbering: 'bottom-center',
          citationStyle: 'APA 7th',
        },
        chapters: [
          {
            order: 1,
            title: 'INTRODUCCIÓN',
            required: true,
            sections: [
              { title: 'Realidad problemática', required: true, minWords: 500 },
              { title: 'Formulación del problema', required: true, minWords: 100 },
              { title: 'Justificación del estudio', required: true, minWords: 300 },
              { title: 'Objetivos', required: true, subsections: [
                { title: 'Objetivo general', required: true, minWords: 50 },
                { title: 'Objetivos específicos', required: true, minWords: 100 },
              ]},
              { title: 'Hipótesis', required: false, minWords: 100 },
            ],
          },
          {
            order: 2,
            title: 'MARCO TEÓRICO',
            required: true,
            sections: [
              { title: 'Antecedentes', required: true, minWords: 1000, subsections: [
                { title: 'Antecedentes internacionales', required: true, minCount: 3 },
                { title: 'Antecedentes nacionales', required: true, minCount: 3 },
              ]},
              { title: 'Bases teóricas', required: true, minWords: 1500 },
              { title: 'Definición de términos', required: true, minWords: 300 },
            ],
          },
          {
            order: 3,
            title: 'METODOLOGÍA',
            required: true,
            sections: [
              { title: 'Tipo y diseño de investigación', required: true, minWords: 200 },
              { title: 'Variables y operacionalización', required: true, minWords: 300 },
              { title: 'Población, muestra y muestreo', required: true, minWords: 200 },
              { title: 'Técnicas e instrumentos de recolección de datos', required: true, minWords: 300 },
              { title: 'Procedimiento', required: true, minWords: 200 },
              { title: 'Método de análisis de datos', required: true, minWords: 200 },
              { title: 'Aspectos éticos', required: true, minWords: 150 },
            ],
          },
          {
            order: 4,
            title: 'RESULTADOS',
            required: true,
            sections: [
              { title: 'Descripción de resultados', required: true, minWords: 500 },
              { title: 'Contrastación de hipótesis', required: false, minWords: 300 },
            ],
          },
          {
            order: 5,
            title: 'DISCUSIÓN',
            required: true,
            minWords: 800,
            sections: [],
          },
          {
            order: 6,
            title: 'CONCLUSIONES',
            required: true,
            minWords: 300,
            sections: [],
          },
          {
            order: 7,
            title: 'RECOMENDACIONES',
            required: true,
            minWords: 200,
            sections: [],
          },
          {
            order: 8,
            title: 'REFERENCIAS',
            required: true,
            minCitations: 20,
            sections: [],
          },
        ],
        appendices: {
          required: false,
          label: 'ANEXOS',
        },
      }),
    },
  });

  // ─── Proyecto de Tesis de Prueba ────────────────────────
  await prisma.thesisProject.upsert({
    where: { id: 'test-project-001' },
    update: {},
    create: {
      id: 'test-project-001',
      title: 'Implementación de un sistema de IA para la evaluación automatizada de tesis universitarias',
      description: 'Este proyecto busca desarrollar una plataforma que utilice inteligencia artificial para la revisión y evaluación de avances de tesis.',
      researchLine: 'Inteligencia Artificial y Educación',
      studentId: student.id,
      advisorId: advisor.id,
      coordinatorId: coordinator.id,
      patternId: pattern.id,
      currentPhase: 'Proyecto de Tesis',
      nextDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
  });

  console.log('✅ Seed completado exitosamente');
  console.log(`   👤 Admin: admin@universidad.edu.pe / admin123`);
  console.log(`   👤 Coordinador: coordinador@universidad.edu.pe / coord123`);
  console.log(`   👤 Asesor: asesor@universidad.edu.pe / asesor123`);
  console.log(`   👤 Estudiante: estudiante@universidad.edu.pe / estudiante123`);
  console.log(`   📄 Patrón: ${pattern.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
