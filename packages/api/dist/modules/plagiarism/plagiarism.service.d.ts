import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PlagiarismService {
    private prisma;
    constructor(prisma: PrismaService);
    getAlertsBySubmission(submissionId: string): Promise<{
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
    }[]>;
    getAllAlerts(page?: number, limit?: number): Promise<{
        data: ({
            submission: {
                id: string;
                fileName: string;
                project: {
                    title: string;
                    student: {
                        firstName: string;
                        lastName: string;
                    };
                };
            };
        } & {
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    reviewAlert(id: string, comment: string): Promise<{
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
    }>;
}
//# sourceMappingURL=plagiarism.service.d.ts.map