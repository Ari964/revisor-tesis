import { PrismaService } from '../../common/prisma/prisma.service';
export declare class CitationsService {
    private prisma;
    constructor(prisma: PrismaService);
    getBySubmission(submissionId: string): Promise<{
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
    }[]>;
    getStats(submissionId: string): Promise<{
        verified: number;
        partial: number;
        notFound: number;
        pending: number;
        total: number;
    }>;
}
//# sourceMappingURL=citations.service.d.ts.map