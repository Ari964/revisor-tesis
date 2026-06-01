import { PrismaService } from '../../common/prisma/prisma.service';
export declare class FeedbackService {
    private prisma;
    constructor(prisma: PrismaService);
    createFeedback(advisorId: string, data: {
        findingId: string;
        wasAccepted: boolean;
        correctedSeverity?: string;
        correctedDescription?: string;
        correctedInstruction?: string;
        advisorNotes?: string;
    }): Promise<{
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
    }>;
    getFeedbackStats(): Promise<{
        total: number;
        accepted: number;
        rejected: number;
        acceptanceRate: number;
    }>;
}
//# sourceMappingURL=feedback.service.d.ts.map