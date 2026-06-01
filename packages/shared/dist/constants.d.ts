export declare const QUEUES: {
    readonly EMBEDDINGS: "embeddings-queue";
    readonly GEMINI_REVIEW: "gemini-review-queue";
    readonly PLAGIARISM: "plagiarism-queue";
    readonly CROSSREF: "crossref-queue";
    readonly NOTIFICATIONS: "notifications-queue";
    readonly DEADLINE_CHECK: "deadline-check-queue";
};
export declare const RATE_LIMITS: {
    readonly GEMINI_RPM: 12;
    readonly GEMINI_RPD: 900;
    readonly CROSSREF_RPS: 1;
    readonly ORCID_RPS: 20;
};
export declare const EMBEDDING_CONFIG: {
    readonly MODEL: "Xenova/nomic-embed-text-v1";
    readonly DIMENSIONS: 768;
    readonly CHUNK_SIZE: 500;
    readonly CHUNK_OVERLAP: 50;
    readonly DOCUMENT_PREFIX: "search_document: ";
    readonly QUERY_PREFIX: "search_query: ";
    readonly SIMILARITY_THRESHOLD: 0.85;
};
export declare const QDRANT_CONFIG: {
    readonly COLLECTION_NAME: "thesis_chunks";
    readonly DISTANCE_METRIC: "Cosine";
};
export declare const FILE_CONFIG: {
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    readonly ALLOWED_EXTENSIONS: readonly [".pdf", ".docx", ".doc"];
};
export declare const NOTIFICATION_TEMPLATES: {
    readonly AI_REVIEW_COMPLETE: {
        readonly title: "📋 Revisión IA completada";
        readonly body: (projectTitle: string) => string;
    };
    readonly ADVISOR_APPROVED: {
        readonly title: "✅ Documento aprobado";
        readonly body: (advisorName: string, projectTitle: string) => string;
    };
    readonly ADVISOR_REJECTED: {
        readonly title: "🔄 Correcciones requeridas";
        readonly body: (advisorName: string, projectTitle: string) => string;
    };
    readonly DEADLINE_REMINDER_48H: {
        readonly title: "⏰ Recordatorio: Entrega en 48 horas";
        readonly body: (projectTitle: string, deadline: string) => string;
    };
    readonly DEADLINE_REMINDER_24H: {
        readonly title: "🚨 Recordatorio urgente: Entrega en 24 horas";
        readonly body: (projectTitle: string, deadline: string) => string;
    };
};
export declare const GEMINI_PROMPTS: {
    readonly SYSTEM_ROLE: "Eres un revisor académico experto especializado en la evaluación de tesis universitarias.\nTu rol es analizar documentos de tesis y detectar errores estructurales, de contenido y de forma.\nSiempre respondes en español.\nEres riguroso pero constructivo en tus observaciones.";
    readonly REVIEW_PROMPT: (patternStructure: string, documentText: string) => string;
    readonly EXTRACT_CITATIONS: (documentText: string) => string;
};
//# sourceMappingURL=constants.d.ts.map