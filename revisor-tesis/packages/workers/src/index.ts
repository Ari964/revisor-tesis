// ==============================================================
// REVISOR DE TESIS — Workers Entry Point
// Inicia todos los workers BullMQ
// ==============================================================

import dotenv from 'dotenv';
import path from 'path';

// Cargar .env desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { startEmbeddingsWorker } from './embeddings.worker';
import { startGeminiWorker } from './gemini.worker';
import { startPlagiarismWorker } from './plagiarism.worker';
import { startCrossrefWorker } from './crossref.worker';
import { startNotificationWorker } from './notification.worker';
import { startDeadlineWorker } from './deadline.worker';

// ─── Conexiones compartidas ─────────────────────────────────

const prisma = new PrismaClient();

const redisConnection = new IORedis({
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
  startEmbeddingsWorker(prisma, redisConnection);
  startGeminiWorker(prisma, redisConnection);
  startPlagiarismWorker(prisma, redisConnection);
  startCrossrefWorker(prisma, redisConnection);
  startNotificationWorker(prisma, redisConnection);
  startDeadlineWorker(prisma, redisConnection);

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
