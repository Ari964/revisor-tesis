import { CitationsService } from './citations.service';
export declare class CitationsController {
    private citationsService;
    constructor(citationsService: CitationsService);
    getBySubmission(submissionId: string): Promise<{
        success: boolean;
        data: {
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
    }>;
    getStats(submissionId: string): Promise<{
        success: boolean;
        data: {
            verified: number;
            partial: number;
            notFound: number;
            pending: number;
            total: number;
        };
    }>;
}
//# sourceMappingURL=citations.controller.d.ts.map