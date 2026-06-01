// ==============================================================
// GEMINI WORKER
// Análisis de tesis con Gemini API (free tier)
// Rate Limiting: 12 RPM con backoff exponencial
// ==============================================================

import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import IORedis from 'ioredis';
import { QUEUES, GEMINI_PROMPTS, RATE_LIMITS } from '@revisor-tesis/shared';

export function startGeminiWorker(prisma: PrismaClient, connection: IORedis) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  const worker = new Worker(
    QUEUES.GEMINI_REVIEW,
    async (job) => {
      const { submissionId, projectId } = job.data;
      console.log(`🤖 [Gemini] Analizando documento ${submissionId}`);

      // Actualizar estado
      await prisma.aiReviewJob.updateMany({
        where: { submissionId, jobType: 'gemini' },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });

      try {
        // 1. Obtener texto del documento
        const submission = await prisma.documentSubmission.findUnique({
          where: { id: submissionId },
          include: {
            project: {
              include: { pattern: true },
            },
          },
        });

        if (!submission || !submission.extractedText) {
          throw new Error('Documento o texto no encontrado');
        }

        // 2. Obtener estructura del patrón
        let patternStructure = 'No hay patrón asignado. Evalúa según estándares académicos generales.';
        if (submission.project.pattern) {
          patternStructure = submission.project.pattern.structure;
        }

        // 3. Truncar texto si es muy largo (Gemini tiene límite de tokens)
        const maxChars = 30000; // ~7500 tokens aprox
        const documentText = submission.extractedText.length > maxChars
          ? submission.extractedText.substring(0, maxChars) + '\n\n[... documento truncado por límite de tokens ...]'
          : submission.extractedText;

        // 4. Construir prompt y llamar a Gemini
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = GEMINI_PROMPTS.REVIEW_PROMPT(patternStructure, documentText);

        const result = await model.generateContent([
          { text: GEMINI_PROMPTS.SYSTEM_ROLE },
          { text: prompt },
        ]);

        const responseText = result.response.text();

        // 5. Parsear respuesta JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('La respuesta de Gemini no contiene JSON válido');
        }

        const review = JSON.parse(jsonMatch[0]);

        // 6. Guardar hallazgos en MySQL
        if (review.findings && Array.isArray(review.findings)) {
          for (const finding of review.findings) {
            await prisma.aiReviewFinding.create({
              data: {
                submissionId,
                category: finding.category || 'CONTENT',
                severity: finding.severity || 'MINOR',
                title: finding.title || 'Observación',
                description: finding.description || '',
                instruction: finding.instruction || '',
                affectedSection: finding.affectedSection,
                suggestedScore: finding.suggestedScore,
              },
            });
          }
        }

        // 7. Actualizar nota general
        await prisma.documentSubmission.update({
          where: { id: submissionId },
          data: {
            overallScore: review.overallScore || null,
            status: 'REVIEWED',
          },
        });

        await prisma.aiReviewJob.updateMany({
          where: { submissionId, jobType: 'gemini' },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        console.log(`✅ [Gemini] Análisis completado: ${review.findings?.length || 0} hallazgos, nota: ${review.overallScore}`);

        // 8. Encolar extracción de citas y notificación
        const crossrefQueue = new Queue(QUEUES.CROSSREF, { connection });
        const notifQueue = new Queue(QUEUES.NOTIFICATIONS, { connection });

        // Extraer citas usando Gemini
        await crossrefQueue.add('extract-and-validate-citations', {
          submissionId,
          projectId,
          documentText: submission.extractedText,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 15000 },
        });

        // Notificar al estudiante
        await notifQueue.add('send-notification', {
          userId: submission.project.studentId,
          type: 'AI_REVIEW_COMPLETE',
          projectTitle: submission.project.title,
          submissionId,
        });

        return { findings: review.findings?.length || 0, score: review.overallScore };

      } catch (error: any) {
        // Manejar rate limiting de Gemini
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          console.warn('⚠️ [Gemini] Rate limit alcanzado, reintentando...');
          await prisma.aiReviewJob.updateMany({
            where: { submissionId, jobType: 'gemini' },
            data: { status: 'RATE_LIMITED', lastError: error.message },
          });
          throw error; // BullMQ reintentará con backoff
        }

        await prisma.aiReviewJob.updateMany({
          where: { submissionId, jobType: 'gemini' },
          data: {
            status: 'FAILED',
            lastError: error.message,
            completedAt: new Date(),
          },
        });

        // Actualizar estado del documento a ERROR para que la UI no se quede en "Analizando IA"
        await prisma.documentSubmission.update({
          where: { id: submissionId },
          data: { status: 'ERROR' },
        });

        throw error;
      }
    },
    {
      connection,
      concurrency: 1,
      limiter: {
        max: RATE_LIMITS.GEMINI_RPM,  // 12 requests
        duration: 60_000,              // por minuto
      },
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`❌ [Gemini] Job ${job?.id} falló:`, error.message);
  });

  console.log(`   ✅ Gemini Worker iniciado (modelo: ${modelName}, límite: ${RATE_LIMITS.GEMINI_RPM} RPM)`);
}
