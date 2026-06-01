// ==============================================================
// NOTIFICATION WORKER — Expo Push Notifications
// ==============================================================

import { Worker } from 'bullmq';
import { PrismaClient, NotificationType } from '@prisma/client';
import IORedis from 'ioredis';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { QUEUES, NOTIFICATION_TEMPLATES } from '@revisor-tesis/shared';

const expo = new Expo();

export function startNotificationWorker(prisma: PrismaClient, connection: IORedis) {
  const worker = new Worker(
    QUEUES.NOTIFICATIONS,
    async (job) => {
      const { userId, type, projectTitle, advisorId, submissionId } = job.data;
      console.log(`🔔 [Notif] Enviando ${type} a usuario ${userId}`);

      // Obtener datos del usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, expoPushToken: true, firstName: true },
      });
      if (!user) return;

      // Construir notificación
      let title = '';
      let body = '';
      const template = NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES];
      if (template) {
        title = template.title;
        if (type === 'AI_REVIEW_COMPLETE' || type === 'DEADLINE_REMINDER_48H' || type === 'DEADLINE_REMINDER_24H') {
          body = (template.body as (t: string, d?: string) => string)(projectTitle || '', '');
        } else if (type === 'ADVISOR_APPROVED' || type === 'ADVISOR_REJECTED') {
          const advisor = advisorId ? await prisma.user.findUnique({ where: { id: advisorId }, select: { firstName: true, lastName: true } }) : null;
          body = (template.body as (n: string, t: string) => string)(`${advisor?.firstName || ''} ${advisor?.lastName || ''}`, projectTitle || '');
        }
      }

      // Guardar en BD
      await prisma.notification.create({
        data: {
          userId, type: type as NotificationType,
          title, body,
          data: JSON.stringify({ submissionId, projectTitle }),
          sentAt: new Date(),
        },
      });

      // Enviar push si tiene token
      if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
        const message: ExpoPushMessage = {
          to: user.expoPushToken,
          sound: 'default',
          title, body,
          data: { submissionId, type },
        };
        try {
          await expo.sendPushNotificationsAsync([message]);
          console.log(`✅ [Notif] Push enviado a ${user.firstName}`);
        } catch (e) {
          console.warn(`⚠️ [Notif] Error push:`, (e as Error).message);
        }
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, error) => {
    console.error(`❌ [Notif] Job ${job?.id} falló:`, error.message);
  });
  console.log('   ✅ Notification Worker iniciado');
}
