import { ThesisService } from './thesis.service';
export declare class ThesisController {
    private thesisService;
    constructor(thesisService: ThesisService);
    create(user: any, body: any): Promise<{
        success: boolean;
        data: {
            student: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            advisor: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
            pattern: {
                id: string;
                name: string;
            } | null;
        } & {
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
    }>;
    findAll(user: any, page?: number, limit?: number): Promise<{
        data: {
            submissionCount: number;
            _count: undefined;
            student: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
            advisor: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            pattern: {
                id: string;
                name: string;
            } | null;
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
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    findById(id: string, user: any): Promise<{
        success: boolean;
        data: {
            student: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
            advisor: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            coordinator: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            pattern: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                version: string;
                structure: string;
                isDefault: boolean;
            } | null;
            submissions: {
                id: string;
                submittedAt: Date;
                fileName: string;
                status: import(".prisma/client").$Enums.DocumentStatus;
                overallScore: number | null;
                advisorApproved: boolean | null;
            }[];
        } & {
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
    }>;
    update(id: string, user: any, body: any): Promise<{
        success: boolean;
        data: {
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
    }>;
}
//# sourceMappingURL=thesis.controller.d.ts.map