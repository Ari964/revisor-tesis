import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ReviewService {
    private prisma;
    constructor(prisma: PrismaService);
    getFindingsBySubmission(submissionId: string): Promise<({
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
    })[]>;
    getFindingById(id: string): Promise<({
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
    }) | null>;
    getJobStatus(submissionId: string): Promise<{
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
    }[]>;
    markFindingResolved(id: string): Promise<{
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
    }>;
}
//# sourceMappingURL=review.service.d.ts.map