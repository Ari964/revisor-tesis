// ==============================================================
// PLAGIARISM WORKER
// Detección de plagio in-house usando similitud vectorial (Qdrant)
// Umbral de alerta: 85% similitud coseno
// ==============================================================

import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import IORedis from 'ioredis';
import { QUEUES, EMBEDDING_CONFIG, QDRANT_CONFIG } from '@revisor-tesis/shared';

export function startPlagiarismWorker(prisma: PrismaClient, connection: IORedis) {
  const qdrant = new QdrantClient({
    url: `http://${process.env.QDRANT_HOST || 'localhost'}:${process.env.QDRANT_PORT || '6333'}`,
  });

  const worker = new Worker(
    QUEUES.PLAGIARISM,
    async (job) => {
      const { submissionId, projectId, chunkCount } = job.data;
      console.log(`🔍 [Plagio] Verificando documento ${submissionId} (${chunkCount} chunks)`);

      // Actualizar estado
      await prisma.aiReviewJob.updateMany({
        where: { submissionId, jobType: 'plagiarism' },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });

      let alertCount = 0;

      try {
        // Para cada chunk del documento, buscar similitud con otros documentos
        for (let i = 0; i < chunkCount; i++) {
          // Obtener el vector del chunk actual desde Qdrant
          const pointId = `${submissionId}-${i}`;

          let point;
          try {
            const points = await qdrant.retrieve(QDRANT_CONFIG.COLLECTION_NAME, {
              ids: [pointId],
              with_vector: true,
              with_payload: true,
            });
            point = points[0];
          } catch {
            continue; // Si no se encuentra el punto, saltar
          }

          if (!point || !point.vector) continue;

          // Buscar chunks similares EXCLUYENDO el propio documento
          const searchResult = await qdrant.search(QDRANT_CONFIG.COLLECTION_NAME, {
            vector: point.vector as number[],
            limit: 5,
            score_threshold: EMBEDDING_CONFIG.SIMILARITY_THRESHOLD, // 0.85
            filter: {
              must_not: [
                {
                  key: 'submissionId',
                  match: { value: submissionId },
                },
              ],
            },
            with_payload: true,
          });

          // Registrar alertas para cada coincidencia sobre el umbral
          for (const match of searchResult) {
            const payload = match.payload as Record<string, any>;

            // Buscar nombre del archivo fuente
            let matchedFileName: string | undefined;
            try {
              const matchedDoc = await prisma.documentSubmission.findUnique({
                where: { id: payload.submissionId },
                select: { fileName: true },
              });
              matchedFileName = matchedDoc?.fileName;
            } catch {
              // Ignorar si no se encuentra
            }

            await prisma.plagiarismAlert.create({
              data: {
                submissionId,
                sourceChunkText: (point.payload as any)?.text || '',
                matchedChunkText: payload.text || '',
                matchedDocumentId: payload.submissionId,
                matchedFileName,
                similarityScore: match.score,
                chunkIndex: i,
              },
            });

            alertCount++;
          }

          // Log progreso
          if ((i + 1) % 20 === 0) {
            console.log(`   🔍 ${i + 1}/${chunkCount} chunks verificados, ${alertCount} alertas`);
            await job.updateProgress(Math.round(((i + 1) / chunkCount) * 100));
          }
        }

        // Actualizar estado del job
        await prisma.aiReviewJob.updateMany({
          where: { submissionId, jobType: 'plagiarism' },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        console.log(`✅ [Plagio] Verificación completada: ${alertCount} alertas de similitud`);
        return { alertCount };

      } catch (error: any) {
        await prisma.aiReviewJob.updateMany({
          where: { submissionId, jobType: 'plagiarism' },
          data: { status: 'FAILED', lastError: error.message, completedAt: new Date() },
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`❌ [Plagio] Job ${job?.id} falló:`, error.message);
  });

  console.log(`   ✅ Plagiarism Worker iniciado (umbral: ${EMBEDDING_CONFIG.SIMILARITY_THRESHOLD * 100}%)`);
}
