"use strict";
// ==============================================================
// NOTIFICATION WORKER — Expo Push Notifications
// ==============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNotificationWorker = startNotificationWorker;
const bullmq_1 = require("bullmq");
const expo_server_sdk_1 = __importDefault(require("expo-server-sdk"));
const shared_1 = require("@revisor-tesis/shared");
const expo = new expo_server_sdk_1.default();
function startNotificationWorker(prisma, connection) {
    const worker = new bullmq_1.Worker(shared_1.QUEUES.NOTIFICATIONS, async (job) => {
        const { userId, type, projectTitle, advisorId, submissionId } = job.data;
        console.log(`🔔 [Notif] Enviando ${type} a usuario ${userId}`);
        // Obtener datos del usuario
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, expoPushToken: true, firstName: true },
        });
        if (!user)
            return;
        // Construir notificación
        let title = '';
        let body = '';
        const template = shared_1.NOTIFICATION_TEMPLATES[type];
        if (template) {
            title = template.title;
            if (type === 'AI_REVIEW_COMPLETE' || type === 'DEADLINE_REMINDER_48H' || type === 'DEADLINE_REMINDER_24H') {
                body = template.body(projectTitle || '', '');
            }
            else if (type === 'ADVISOR_APPROVED' || type === 'ADVISOR_REJECTED') {
                const advisor = advisorId ? await prisma.user.findUnique({ where: { id: advisorId }, select: { firstName: true, lastName: true } }) : null;
                body = template.body(`${advisor?.firstName || ''} ${advisor?.lastName || ''}`, projectTitle || '');
            }
        }
        // Guardar en BD
        await prisma.notification.create({
            data: {
                userId, type: type,
                title, body,
                data: JSON.stringify({ submissionId, projectTitle }),
                sentAt: new Date(),
            },
        });
        // Enviar push si tiene token
        if (user.expoPushToken && expo_server_sdk_1.default.isExpoPushToken(user.expoPushToken)) {
            const message = {
                to: user.expoPushToken,
                sound: 'default',
                title, body,
                data: { submissionId, type },
            };
            try {
                await expo.sendPushNotificationsAsync([message]);
                console.log(`✅ [Notif] Push enviado a ${user.firstName}`);
            }
            catch (e) {
                console.warn(`⚠️ [Notif] Error push:`, e.message);
            }
        }
    }, { connection, concurrency: 5 });
    worker.on('failed', (job, error) => {
        console.error(`❌ [Notif] Job ${job?.id} falló:`, error.message);
    });
    console.log('   ✅ Notification Worker iniciado');
}
//# sourceMappingURL=notification.worker.js.map