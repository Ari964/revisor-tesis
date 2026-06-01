"use strict";
// ==============================================================
// PLAGIARISM WORKER
// Detección de plagio in-house usando similitud vectorial (Qdrant)
// Umbral de alerta: 85% similitud coseno
// ==============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPlagiarismWorker = startPlagiarismWorker;
const bullmq_1 = require("bullmq");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const shared_1 = require("@revisor-tesis/shared");
function startPlagiarismWorker(prisma, connection) {
    const qdrant = new js_client_rest_1.QdrantClient({
        url: `http://${process.env.QDRANT_HOST || 'localhost'}:${process.env.QDRANT_PORT || '6333'}`,
    });
    const worker = new bullmq_1.Worker(shared_1.QUEUES.PLAGIARISM, async (job) => {
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
                    const points = await qdrant.retrieve(shared_1.QDRANT_CONFIG.COLLECTION_NAME, {
                        ids: [pointId],
                        with_vector: true,
                        with_payload: true,
                    });
                    point = points[0];
                }
                catch {
                    continue; // Si no se encuentra el punto, saltar
                }
                if (!point || !point.vector)
                    continue;
                // Buscar chunks similares EXCLUYENDO el propio documento
                const searchResult = await qdrant.search(shared_1.QDRANT_CONFIG.COLLECTION_NAME, {
                    vector: point.vector,
                    limit: 5,
                    score_threshold: shared_1.EMBEDDING_CONFIG.SIMILARITY_THRESHOLD, // 0.85
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
                    const payload = match.payload;
                    // Buscar nombre del archivo fuente
                    let matchedFileName;
                    try {
                        const matchedDoc = await prisma.documentSubmission.findUnique({
                            where: { id: payload.submissionId },
                            select: { fileName: true },
                        });
                        matchedFileName = matchedDoc?.fileName;
                    }
                    catch {
                        // Ignorar si no se encuentra
                    }
                    await prisma.plagiarismAlert.create({
                        data: {
                            submissionId,
                            sourceChunkText: point.payload?.text || '',
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
        }
        catch (error) {
            await prisma.aiReviewJob.updateMany({
                where: { submissionId, jobType: 'plagiarism' },
                data: { status: 'FAILED', lastError: error.message, completedAt: new Date() },
            });
            throw error;
        }
    }, {
        connection,
        concurrency: 2,
    });
    worker.on('failed', (job, error) => {
        console.error(`❌ [Plagio] Job ${job?.id} falló:`, error.message);
    });
    console.log(`   ✅ Plagiarism Worker iniciado (umbral: ${shared_1.EMBEDDING_CONFIG.SIMILARITY_THRESHOLD * 100}%)`);
}
//# sourceMappingURL=plagiarism.worker.js.map