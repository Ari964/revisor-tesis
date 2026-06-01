"use strict";
// ==============================================================
// REVISOR DE TESIS — Workers Entry Point
// Inicia todos los workers BullMQ
// ==============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Cargar .env desde la raíz del monorepo
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const client_1 = require("@prisma/client");
const ioredis_1 = __importDefault(require("ioredis"));
const embeddings_worker_1 = require("./embeddings.worker");
const gemini_worker_1 = require("./gemini.worker");
const plagiarism_worker_1 = require("./plagiarism.worker");
const crossref_worker_1 = require("./crossref.worker");
const notification_worker_1 = require("./notification.worker");
const deadline_worker_1 = require("./deadline.worker");
// ─── Conexiones compartidas ─────────────────────────────────
const prisma = new client_1.PrismaClient();
const redisConnection = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});
// ─── Arranque de Workers ────────────────────────────────────
async function main() {
    console.log('🔧 Iniciando workers de Revisor de Tesis...');
    await prisma.$connect();
    console.log('✅ Prisma conectado a MySQL');
    // Iniciar cada worker
    (0, embeddings_worker_1.startEmbeddingsWorker)(prisma, redisConnection);
    (0, gemini_worker_1.startGeminiWorker)(prisma, redisConnection);
    (0, plagiarism_worker_1.startPlagiarismWorker)(prisma, redisConnection);
    (0, crossref_worker_1.startCrossrefWorker)(prisma, redisConnection);
    (0, notification_worker_1.startNotificationWorker)(prisma, redisConnection);
    (0, deadline_worker_1.startDeadlineWorker)(prisma, redisConnection);
    console.log('🚀 Todos los workers están corriendo');
    console.log('   📊 Embeddings Worker (local, sin API)');
    console.log('   🤖 Gemini Worker (rate-limited: 12 RPM)');
    console.log('   🔍 Plagiarism Worker (Qdrant similarity)');
    console.log('   📚 CrossRef Worker (rate-limited: 1 RPS)');
    console.log('   🔔 Notification Worker (Expo Push)');
    console.log('   ⏰ Deadline Worker (check cada hora)');
}
main().catch((error) => {
    console.error('❌ Error fatal en workers:', error);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Apagando workers...');
    await prisma.$disconnect();
    redisConnection.disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map