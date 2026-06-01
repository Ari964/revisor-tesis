import { ReviewService } from './review.service';
import { FeedbackService } from './feedback.service';
export declare class ReviewController {
    private reviewService;
    private feedbackService;
    constructor(reviewService: ReviewService, feedbackService: FeedbackService);
    getFindings(submissionId: string): Promise<{
        success: boolean;
        data: ({
            feedbackCorrection: {
                id: string;
                createdAt: Date;
                advisorId: string;
                originalSeverity: import(".prisma/client").$Enums.FindingSeverity;
                correctedSeverity: import(".prisma/client").$Enums.FindingSeverity | null;
                originalDescription: string;
                correctedDescription: string | null;
                originalInstruction: string;
                correctedInstruction: string | null;
                wasAccepted: boolean;
                advisorNotes: string | null;
                findingId: string;
            } | null;
        } & {
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
        })[];
    }>;
    getFinding(id: string): Promise<{
        success: boolean;
        data: ({
            feedbackCorrection: {
                id: string;
                createdAt: Date;
                advisorId: string;
                originalSeverity: import(".prisma/client").$Enums.FindingSeverity;
                correctedSeverity: import(".prisma/client").$Enums.FindingSeverity | null;
                originalDescription: string;
                correctedDescription: string | null;
                originalInstruction: string;
                correctedInstruction: string | null;
                wasAccepted: boolean;
                advisorNotes: string | null;
                findingId: string;
            } | null;
        } & {
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
        }) | null;
    }>;
    getJobStatus(submissionId: string): Promise<{
        success: boolean;
        data: {
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
    }>;
    resolveFinding(id: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
    createFeedback(advisorId: string, body: any): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            advisorId: string;
            originalSeverity: import(".prisma/client").$Enums.FindingSeverity;
            correctedSeverity: import(".prisma/client").$Enums.FindingSeverity | null;
            originalDescription: string;
            correctedDescription: string | null;
            originalInstruction: string;
            correctedInstruction: string | null;
            wasAccepted: boolean;
            advisorNotes: string | null;
            findingId: string;
        };
    }>;
    getFeedbackStats(): Promise<{
        success: boolean;
        data: {
            total: number;
            accepted: number;
            rejected: number;
            acceptanceRate: number;
        };
    }>;
}
//# sourceMappingURL=review.controller.d.ts.map