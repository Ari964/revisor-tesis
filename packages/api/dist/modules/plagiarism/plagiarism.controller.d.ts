import { PlagiarismService } from './plagiarism.service';
export declare class PlagiarismController {
    private plagiarismService;
    constructor(plagiarismService: PlagiarismService);
    getBySubmission(submissionId: string): Promise<{
        success: boolean;
        data: {
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
    }>;
    getAll(page?: number, limit?: number): Promise<{
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
        success: boolean;
    }>;
    review(id: string, comment: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
}
//# sourceMappingURL=plagiarism.controller.d.ts.map