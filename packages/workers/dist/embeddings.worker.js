"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEmbeddingsWorker = startEmbeddingsWorker;
// ==============================================================
// EMBEDDINGS WORKER
// Genera embeddings locales con Transformers.js (cero costo API)
// Modelo: Xenova/nomic-embed-text-v1 (768 dimensiones, ONNX)
// ==============================================================
const crypto_1 = require("crypto");
const bullmq_1 = require("bullmq");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const shared_1 = require("@revisor-tesis/shared");
// Pipeline y modelo se cargan una sola vez en memoria
let extractor = null;
async function getExtractor() {
    if (!extractor) {
        console.log('📦 Cargando modelo de embeddings (primera vez, puede tardar ~30s)...');
        const transformers = await Promise.resolve().then(() => __importStar(require('@huggingface/transformers')));
        // Configurar directorio de caché local para evitar descargar en RAM
        // Usa un path absoluto en el workspace (Disco E:)
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        transformers.env.cacheDir = path.resolve(process.cwd(), '../../.transformers-cache');
        extractor = await transformers.pipeline('feature-extraction', shared_1.EMBEDDING_CONFIG.MODEL, {
            dtype: 'q8', // Forzar modelo cuantizado para reducir uso de RAM
        });
        console.log('✅ Modelo de embeddings cargado en memoria');
    }
    return extractor;
}
// ─── Chunking de texto ──────────────────────────────────────
function chunkText(text, chunkSize, overlap) {
    const words = text.split(/\s+/);
    const chunks = [];
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
async function generateEmbedding(text) {
    const ext = await getExtractor();
    const prefixed = `${shared_1.EMBEDDING_CONFIG.DOCUMENT_PREFIX}${text}`;
    const output = await ext(prefixed, { pooling: 'mean', normalize: true });
    return Array.from(output.data).slice(0, shared_1.EMBEDDING_CONFIG.DIMENSIONS);
}
// ─── Worker ─────────────────────────────────────────────────
function startEmbeddingsWorker(prisma, connection) {
    const qdrant = new js_client_rest_1.QdrantClient({
        url: `http://${process.env.QDRANT_HOST || 'localhost'}:${process.env.QDRANT_PORT || '6333'}`,
    });
    // Asegurar que la colección existe
    initQdrantCollection(qdrant).catch(console.error);
    const worker = new bullmq_1.Worker(shared_1.QUEUES.EMBEDDINGS, async (job) => {
        const { submissionId, projectId, text } = job.data;
        console.log(`📐 [Embeddings] Procesando documento ${submissionId}`);
        // Actualizar estado del job
        await prisma.aiReviewJob.updateMany({
            where: { submissionId, jobType: 'embeddings' },
            data: { status: 'PROCESSING', startedAt: new Date() },
        });
        // 1. Dividir texto en chunks
        const chunks = chunkText(text, shared_1.EMBEDDING_CONFIG.CHUNK_SIZE, shared_1.EMBEDDING_CONFIG.CHUNK_OVERLAP);
        console.log(`   📄 ${chunks.length} chunks generados`);
        // 2. Generar embeddings y preparar puntos
        const points = [];
        for (let i = 0; i < chunks.length; i++) {
            const embedding = await generateEmbedding(chunks[i]);
            points.push({
                id: (0, crypto_1.randomUUID)(), // 🔴 CORRECCIÓN: Genera un UUID válido para Qdrant
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
                await qdrant.upsert(shared_1.QDRANT_CONFIG.COLLECTION_NAME, {
                    wait: true,
                    points: batch,
                });
            }
            catch (error) {
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
        const geminiQueue = new bullmq_1.Queue(shared_1.QUEUES.GEMINI_REVIEW, { connection });
        const plagiarismQueue = new bullmq_1.Queue(shared_1.QUEUES.PLAGIARISM, { connection });
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
    }, {
        connection,
        concurrency: 1, // Secuencial (el modelo es pesado en memoria)
    });
    worker.on('failed', (job, error) => {
        console.error(`❌ [Embeddings] Job ${job?.id} falló:`, error.message);
    });
    console.log('   ✅ Embeddings Worker iniciado');
}
// ─── Inicializar colección Qdrant ───────────────────────────
async function initQdrantCollection(qdrant) {
    try {
        await qdrant.getCollection(shared_1.QDRANT_CONFIG.COLLECTION_NAME);
        console.log('   ✅ Colección Qdrant existente verificada');
    }
    catch {
        console.log('   📦 Creando colección Qdrant...');
        await qdrant.createCollection(shared_1.QDRANT_CONFIG.COLLECTION_NAME, {
            vectors: {
                size: shared_1.EMBEDDING_CONFIG.DIMENSIONS,
                distance: shared_1.QDRANT_CONFIG.DISTANCE_METRIC,
            },
        });
        console.log('   ✅ Colección Qdrant creada');
    }
}
//# sourceMappingURL=embeddings.worker.js.map