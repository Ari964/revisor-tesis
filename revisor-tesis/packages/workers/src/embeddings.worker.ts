// ==============================================================
// EMBEDDINGS WORKER
// Genera embeddings locales con Transformers.js (cero costo API)
// Modelo: Xenova/nomic-embed-text-v1 (768 dimensiones, ONNX)
// ==============================================================
import { randomUUID } from 'crypto';
import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import IORedis from 'ioredis';
import { QUEUES, EMBEDDING_CONFIG, QDRANT_CONFIG } from '@revisor-tesis/shared';

// Pipeline y modelo se cargan una sola vez en memoria
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    console.log('📦 Cargando modelo de embeddings (primera vez, puede tardar ~30s)...');
    const transformers = await import('@huggingface/transformers');

    // Configurar directorio de caché local para evitar descargar en RAM
    // Usa un path absoluto en el workspace (Disco E:)
    const path = await import('path');
    transformers.env.cacheDir = path.resolve(process.cwd(), '../../.transformers-cache');

    extractor = await transformers.pipeline('feature-extraction', EMBEDDING_CONFIG.MODEL, {
      dtype: 'q8', // Forzar modelo cuantizado para reducir uso de RAM
    });
    console.log('✅ Modelo de embeddings cargado en memoria');
  }
  return extractor;
}

// ─── Chunking de texto ──────────────────────────────────────

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    if (chunk.trim().length > 20) { // Ignorar chunks muy cortos
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
  }

  return chunks;
}

// ─── Generación de embeddings ───────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const prefixed = `${EMBEDDING_CONFIG.DOCUMENT_PREFIX}${text}`;
  const output = await ext(prefixed, { pooling: 'mean', normalize: true });
  return Array.from(output.data).slice(0, EMBEDDING_CONFIG.DIMENSIONS) as number[];
}

// ─── Worker ─────────────────────────────────────────────────

export function startEmbeddingsWorker(prisma: PrismaClient, connection: IORedis) {
  const qdrant = new QdrantClient({
    url: `http://${process.env.QDRANT_HOST || 'localhost'}:${process.env.QDRANT_PORT || '6333'}`,
  });

  // Asegurar que la colección existe
  initQdrantCollection(qdrant).catch(console.error);

  const worker = new Worker(
    QUEUES.EMBEDDINGS,
    async (job) => {
      const { submissionId, projectId, text } = job.data;

      console.log(`📐 [Embeddings] Procesando documento ${submissionId}`);

      // Actualizar estado del job
      await prisma.aiReviewJob.updateMany({
        where: { submissionId, jobType: 'embeddings' },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });

      // 1. Dividir texto en chunks
      const chunks = chunkText(
        text,
        EMBEDDING_CONFIG.CHUNK_SIZE,
        EMBEDDING_CONFIG.CHUNK_OVERLAP,
      );

      console.log(`   📄 ${chunks.length} chunks generados`);

      // 2. Generar embeddings y preparar puntos
      const points = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbedding(chunks[i]);
        points.push({
          id: randomUUID(), // 🔴 CORRECCIÓN: Genera un UUID válido para Qdrant
          vector: embedding,
          payload: {
            submissionId,
            projectId,
            chunkIndex: i, // Guardamos el índice aquí adentro en vez del ID
            text: chunks[i],
            createdAt: new Date().toISOString(),
          },
        });

        // Log progreso cada 10 chunks
        if ((i + 1) % 10 === 0) {
          console.log(`   📊 ${i + 1}/${chunks.length} chunks vectorizados`);
          await job.updateProgress(Math.round(((i + 1) / chunks.length) * 100));
        }
      }

      // 3. Upsert en Qdrant (en batches de 100) con control de errores
      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        try {
          await qdrant.upsert(QDRANT_CONFIG.COLLECTION_NAME, {
            wait: true,
            points: batch,
          });
        } catch (error: any) {
          // 🔴 CORRECCIÓN: Imprimir el error real si Qdrant vuelve a quejarse
          console.error("🔥 Error exacto de Qdrant:", error.response?.data || error.message || error);
          throw error; // Detener el job
        }
      }

      // 4. Actualizar MySQL
      await prisma.documentSubmission.update({
        where: { id: submissionId },
        data: { chunkCount: chunks.length, status: 'ANALYZING' },
      });

      await prisma.aiReviewJob.updateMany({
        where: { submissionId, jobType: 'embeddings' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      console.log(`✅ [Embeddings] Documento ${submissionId} vectorizado (${chunks.length} chunks)`);

      // 5. Encolar siguiente paso: análisis Gemini + detección de plagio
      const geminiQueue = new Queue(QUEUES.GEMINI_REVIEW, { connection });
      const plagiarismQueue = new Queue(QUEUES.PLAGIARISM, { connection });

      // Crear jobs en BD
      await prisma.aiReviewJob.createMany({
        data: [
          { submissionId, jobType: 'gemini', status: 'PENDING' },
          { submissionId, jobType: 'plagiarism', status: 'PENDING' },
        ],
      });

      await geminiQueue.add('analyze-document', {
        submissionId,
        projectId,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
      });

      await plagiarismQueue.add('check-plagiarism', {
        submissionId,
        projectId,
        chunkCount: chunks.length,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      return { chunks: chunks.length };
    },
    {
      connection,
      concurrency: 1, // Secuencial (el modelo es pesado en memoria)
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`❌ [Embeddings] Job ${job?.id} falló:`, error.message);
  });

  console.log('   ✅ Embeddings Worker iniciado');
}

// ─── Inicializar colección Qdrant ───────────────────────────

async function initQdrantCollection(qdrant: QdrantClient) {
  try {
    await qdrant.getCollection(QDRANT_CONFIG.COLLECTION_NAME);
    console.log('   ✅ Colección Qdrant existente verificada');
  } catch {
    console.log('   📦 Creando colección Qdrant...');
    await qdrant.createCollection(QDRANT_CONFIG.COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_CONFIG.DIMENSIONS,
        distance: QDRANT_CONFIG.DISTANCE_METRIC,
      },
    });
    console.log('   ✅ Colección Qdrant creada');
  }
}
