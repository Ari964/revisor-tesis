// ==============================================================
// Constantes compartidas del proyecto
// ==============================================================

// ─── BullMQ Queue Names ─────────────────────────────────────
export const QUEUES = {
  EMBEDDINGS: 'embeddings-queue',
  GEMINI_REVIEW: 'gemini-review-queue',
  PLAGIARISM: 'plagiarism-queue',
  CROSSREF: 'crossref-queue',
  NOTIFICATIONS: 'notifications-queue',
  DEADLINE_CHECK: 'deadline-check-queue',
} as const;

// ─── Rate Limits ────────────────────────────────────────────
export const RATE_LIMITS = {
  GEMINI_RPM: 12,         // 12 req/min (margen sobre 15 RPM free tier)
  GEMINI_RPD: 900,        // 900 req/día (margen sobre 1000 RPD)
  CROSSREF_RPS: 1,        // 1 req/seg (polite pool)
  ORCID_RPS: 20,          // 20 req/seg (margen sobre 24 RPS)
} as const;

// ─── Embeddings Config ──────────────────────────────────────
export const EMBEDDING_CONFIG = {
  MODEL: 'Xenova/nomic-embed-text-v1',
  DIMENSIONS: 768,
  CHUNK_SIZE: 500,        // tokens por chunk
  CHUNK_OVERLAP: 50,      // tokens de overlap entre chunks
  DOCUMENT_PREFIX: 'search_document: ',
  QUERY_PREFIX: 'search_query: ',
  SIMILARITY_THRESHOLD: 0.85, // Umbral de plagio
} as const;

// ─── Qdrant Config ──────────────────────────────────────────
export const QDRANT_CONFIG = {
  COLLECTION_NAME: 'thesis_chunks',
  DISTANCE_METRIC: 'Cosine' as const,
} as const;

// ─── File Upload Config ─────────────────────────────────────
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ] as const,
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.doc'] as const,
} as const;

// ─── Notification Templates ─────────────────────────────────
export const NOTIFICATION_TEMPLATES = {
  AI_REVIEW_COMPLETE: {
    title: '📋 Revisión IA completada',
    body: (projectTitle: string) =>
      `La revisión automática de tu documento en "${projectTitle}" ha finalizado. Revisa los hallazgos.`,
  },
  ADVISOR_APPROVED: {
    title: '✅ Documento aprobado',
    body: (advisorName: string, projectTitle: string) =>
      `${advisorName} ha aprobado tu avance en "${projectTitle}".`,
  },
  ADVISOR_REJECTED: {
    title: '🔄 Correcciones requeridas',
    body: (advisorName: string, projectTitle: string) =>
      `${advisorName} ha solicitado correcciones en tu avance de "${projectTitle}".`,
  },
  DEADLINE_REMINDER_48H: {
    title: '⏰ Recordatorio: Entrega en 48 horas',
    body: (projectTitle: string, deadline: string) =>
      `Tu próxima entrega en "${projectTitle}" vence el ${deadline}. ¡No olvides subirla!`,
  },
  DEADLINE_REMINDER_24H: {
    title: '🚨 Recordatorio urgente: Entrega en 24 horas',
    body: (projectTitle: string, deadline: string) =>
      `¡URGENTE! La entrega de "${projectTitle}" vence mañana ${deadline}.`,
  },
} as const;

// ─── Gemini Prompt Templates ────────────────────────────────
export const GEMINI_PROMPTS = {
  SYSTEM_ROLE: `Eres un revisor académico experto especializado en la evaluación de tesis universitarias.
Tu rol es analizar documentos de tesis y detectar errores estructurales, de contenido y de forma.
Siempre respondes en español.
Eres riguroso pero constructivo en tus observaciones.`,

  REVIEW_PROMPT: (patternStructure: string, documentText: string) => `
## Instrucción
Analiza el siguiente documento de tesis comparándolo contra la estructura esperada (patrón).
Identifica todos los errores y áreas de mejora.

## Estructura Esperada (Patrón)
${patternStructure}

## Documento a Revisar
${documentText}

## Formato de Respuesta
Responde EXCLUSIVAMENTE con un JSON válido con la siguiente estructura:
{
  "overallScore": <número del 0 al 20>,
  "summary": "<resumen general de la revisión en 2-3 oraciones>",
  "findings": [
    {
      "category": "<STRUCTURE|CONTENT|FORMAT|CITATION|GRAMMAR|COHERENCE>",
      "severity": "<CRITICAL|MAJOR|MINOR|INFO>",
      "title": "<título corto del hallazgo>",
      "description": "<descripción detallada del problema encontrado>",
      "instruction": "<instrucción específica para corregir el problema>",
      "affectedSection": "<sección afectada del documento>",
      "suggestedScore": <nota parcial sugerida para esta sección, 0-20>
    }
  ]
}

## Reglas
- Usa CRITICAL para errores que invalidan el documento (secciones faltantes, plagio evidente).
- Usa MAJOR para problemas significativos (contenido insuficiente, errores metodológicos).
- Usa MINOR para mejoras recomendadas (redacción, formato menor).
- Usa INFO para observaciones positivas o sugerencias opcionales.
- Cada hallazgo debe tener una instrucción clara y accionable.
- El overallScore debe reflejar el promedio ponderado de los hallazgos.
`,

  EXTRACT_CITATIONS: (documentText: string) => `
## Instrucción
Extrae TODAS las referencias bibliográficas/citas del siguiente documento de tesis.

## Documento
${documentText}

## Formato de Respuesta
Responde EXCLUSIVAMENTE con un JSON válido:
{
  "citations": [
    {
      "rawText": "<texto completo de la cita tal como aparece>",
      "title": "<título extraído del artículo/libro>",
      "authors": "<autores separados por coma>",
      "year": "<año de publicación>",
      "doi": "<DOI si está presente, null si no>"
    }
  ]
}
`,
} as const;
