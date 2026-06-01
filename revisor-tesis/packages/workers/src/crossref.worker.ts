// ==============================================================
// CROSSREF WORKER — Validación de citas bibliográficas
// Rate Limiting: 1 req/seg (polite pool)
// ==============================================================

import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { QUEUES, RATE_LIMITS, GEMINI_PROMPTS } from '@revisor-tesis/shared';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ExtractedCitation {
  rawText: string;
  title?: string;
  authors?: string;
  year?: string;
  doi?: string;
}

export function startCrossrefWorker(prisma: PrismaClient, connection: IORedis) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const mailto = process.env.CROSSREF_MAILTO || 'test@universidad.edu.pe';

  const worker = new Worker(
    QUEUES.CROSSREF,
    async (job) => {
      const { submissionId, documentText } = job.data;
      console.log(`📚 [CrossRef] Validando citas del documento ${submissionId}`);

      await prisma.aiReviewJob.create({
        data: { submissionId, jobType: 'crossref', status: 'PROCESSING', startedAt: new Date() },
      });

      try {
        // 1. Extraer citas usando Gemini
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' });
        const refSection = documentText.substring(documentText.length - 8000);
        const prompt = GEMINI_PROMPTS.EXTRACT_CITATIONS(refSection);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No se pudieron extraer citas');
        const parsed = JSON.parse(jsonMatch[0]);
        const citations: ExtractedCitation[] = parsed.citations || [];
        console.log(`   📖 ${citations.length} citas extraídas`);

        // 2. Validar cada cita contra CrossRef (1 req/seg)
        for (let i = 0; i < citations.length; i++) {
          const citation = citations[i];
          let status: 'VERIFIED' | 'PARTIAL' | 'NOT_FOUND' = 'NOT_FOUND';
          let crossrefData: any = {};
          let matchScore = 0;

          try {
            const query = encodeURIComponent(citation.title || citation.rawText.substring(0, 100));
            const url = `https://api.crossref.org/works?query=${query}&rows=3&mailto=${mailto}`;
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json() as any;
              const items = data.message?.items || [];
              if (items.length > 0) {
                const best = items[0];
                crossrefData = {
                  doi: best.DOI,
                  title: best.title?.[0],
                  year: best.published?.['date-parts']?.[0]?.[0]?.toString(),
                  authors: best.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`).join(', '),
                };
                // Calcular match score
                const titleMatch = citation.title && crossrefData.title?.toLowerCase().includes(citation.title.toLowerCase().substring(0, 20));
                const yearMatch = citation.year === crossrefData.year;
                if (titleMatch && yearMatch) { status = 'VERIFIED'; matchScore = 0.95; }
                else if (titleMatch || yearMatch) { status = 'PARTIAL'; matchScore = 0.6; }
              }
            }
          } catch { /* Ignorar errores de red */ }

          await prisma.citationValidation.create({
            data: {
              submissionId, rawCitation: citation.rawText,
              extractedTitle: citation.title, extractedDoi: citation.doi,
              extractedYear: citation.year, extractedAuthors: citation.authors,
              crossrefDoi: crossrefData.doi, crossrefTitle: crossrefData.title,
              crossrefYear: crossrefData.year, crossrefAuthors: crossrefData.authors,
              status, matchScore,
            },
          });

          // Rate limit: esperar 1 segundo entre peticiones
          if (i < citations.length - 1) {
            await new Promise((r) => setTimeout(r, 1000 / RATE_LIMITS.CROSSREF_RPS));
          }
        }

        await prisma.aiReviewJob.updateMany({
          where: { submissionId, jobType: 'crossref' },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        console.log(`✅ [CrossRef] Validación completada para ${citations.length} citas`);
        return { citationsValidated: citations.length };
      } catch (error: any) {
        await prisma.aiReviewJob.updateMany({
          where: { submissionId, jobType: 'crossref' },
          data: { status: 'FAILED', lastError: error.message, completedAt: new Date() },
        });
        throw error;
      }
    },
    { connection, concurrency: 1, limiter: { max: 1, duration: 1200 } },
  );

  worker.on('failed', (job, error) => {
    console.error(`❌ [CrossRef] Job ${job?.id} falló:`, error.message);
  });
  console.log('   ✅ CrossRef Worker iniciado (1 RPS polite pool)');
}
