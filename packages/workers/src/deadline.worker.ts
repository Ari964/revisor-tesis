// ==============================================================
// DEADLINE WORKER — Recordatorios automáticos
// Verifica deadlines cada hora y envía notificaciones 48h/24h antes
// ==============================================================

import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { QUEUES } from '@revisor-tesis/shared';

export function startDeadlineWorker(prisma: PrismaClient, connection: IORedis) {
  const notifQueue = new Queue(QUEUES.NOTIFICATIONS, { connection });

  // Verificar deadlines cada hora
  const checkDeadlines = async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in49h = new Date(now.getTime() + 49 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Proyectos con deadline en ~48h
    const projects48h = await prisma.thesisProject.findMany({
      where: { isActive: true, nextDeadline: { gte: in48h, lt: in49h } },
      select: { id: true, title: true, studentId: true, nextDeadline: true },
    });

    for (const p of projects48h) {
      await notifQueue.add('send-notification', {
        userId: p.studentId,
        type: 'DEADLINE_REMINDER_48H',
        projectTitle: p.title,
      });
    }

    // Proyectos con deadline en ~24h
    const projects24h = await prisma.thesisProject.findMany({
      where: { isActive: true, nextDeadline: { gte: in24h, lt: in25h } },
      select: { id: true, title: true, studentId: true, nextDeadline: true },
    });

    for (const p of projects24h) {
      await notifQueue.add('send-notification', {
        userId: p.studentId,
        type: 'DEADLINE_REMINDER_24H',
        projectTitle: p.title,
      });
    }

    if (projects48h.length + projects24h.length > 0) {
      console.log(`⏰ [Deadline] ${projects48h.length} recordatorios 48h, ${projects24h.length} recordatorios 24h`);
    }
  };

  // Ejecutar inmediatamente y luego cada hora
  checkDeadlines().catch(console.error);
  setInterval(() => checkDeadlines().catch(console.error), 60 * 60 * 1000);

  console.log('   ✅ Deadline Worker iniciado (check cada hora)');
}
