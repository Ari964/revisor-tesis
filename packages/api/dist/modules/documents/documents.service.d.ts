import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
export declare class DocumentsService {
    private prisma;
    private minio;
    private embeddingsQueue;
    private notificationsQueue;
    constructor(prisma: PrismaService, minio: MinioService, embeddingsQueue: Queue, notificationsQueue: Queue);
    uploadDocument(projectId: string, file: Express.Multer.File): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        submittedAt: Date;
        projectId: string;
        fileName: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        extractedText: string | null;
        chunkCount: number | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        overallScore: number | null;
        advisorApproved: boolean | null;
        advisorComment: string | null;
        reviewedAt: Date | null;
    }>;
    findByProject(projectId: string, page?: number, limit?: number): Promise<{
        data: {
            findingsCount: number;
            plagiarismAlertsCount: number;
            citationsCount: number;
            _count: undefined;
            extractedText: undefined;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            submittedAt: Date;
            projectId: string;
            fileName: string;
            fileKey: string;
            fileSize: number;
            mimeType: string;
            chunkCount: number | null;
            status: import(".prisma/client").$Enums.DocumentStatus;
            overallScore: number | null;
            advisorApproved: boolean | null;
            advisorComment: string | null;
            reviewedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<{
        project: {
            id: string;
            title: string;
            studentId: string;
            advisorId: string | null;
        };
        aiReviewJobs: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.JobStatus;
            jobType: string;
            bullJobId: string | null;
            attempts: number;
            lastError: string | null;
            startedAt: Date | null;
            completedAt: Date | null;
            submissionId: string;
        }[];
        findings: {
            id: string;
            createdAt: Date;
            title: string;
            description: string;
            submissionId: string;
            severity: import(".prisma/client").$Enums.FindingSeverity;
            category: import(".prisma/client").$Enums.FindingCategory;
            instruction: string;
            affectedSection: string | null;
            pageNumber: number | null;
            suggestedScore: number | null;
            originalText: string | null;
            isResolved: boolean;
        }[];
        plagiarismAlerts: {
            id: string;
            createdAt: Date;
            submissionId: string;
            similarityScore: number;
            sourceChunkText: string;
            matchedChunkText: string;
            matchedDocumentId: string;
            matchedFileName: string | null;
            chunkIndex: number;
            isReviewed: boolean;
            reviewerComment: string | null;
        }[];
        citationValidations: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.CitationStatus;
            submissionId: string;
            rawCitation: string;
            extractedTitle: string | null;
            extractedDoi: string | null;
            extractedYear: string | null;
            extractedAuthors: string | null;
            crossrefDoi: string | null;
            crossrefTitle: string | null;
            crossrefYear: string | null;
            crossrefAuthors: string | null;
            matchScore: number | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        submittedAt: Date;
        projectId: string;
        fileName: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        extractedText: string | null;
        chunkCount: number | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        overallScore: number | null;
        advisorApproved: boolean | null;
        advisorComment: string | null;
        reviewedAt: Date | null;
    }>;
    approveReject(submissionId: string, advisorId: string, approved: boolean, comment?: string): Promise<{
        project: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            researchLine: string | null;
            currentPhase: string | null;
            nextDeadline: Date | null;
            studentId: string;
            advisorId: string | null;
            coordinatorId: string | null;
            patternId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        submittedAt: Date;
        projectId: string;
        fileName: string;
        fileKey: string;
        fileSize: number;
        mimeType: string;
        extractedText: string | null;
        chunkCount: number | null;
        status: import(".prisma/client").$Enums.DocumentStatus;
        overallScore: number | null;
        advisorApproved: boolean | null;
        advisorComment: string | null;
        reviewedAt: Date | null;
    }>;
    getDownloadUrl(id: string): Promise<string>;
    private extractText;
}
//# sourceMappingURL=documents.service.d.ts.map