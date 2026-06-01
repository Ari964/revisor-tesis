import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(role?: UserRole, page?: number, limit?: number): Promise<{
        data: {
            orcidId: string | undefined;
            orcidProfile: undefined;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            avatarUrl: string | null;
            createdAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    getProfile(user: any): Promise<{
        success: boolean;
        data: {
            orcidProfile: {
                refreshToken: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                orcidId: string;
                accessToken: string | null;
                displayName: string | null;
                biography: string | null;
                keywords: string | null;
                works: string | null;
                lastSyncAt: Date | null;
            } | null;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            avatarUrl: string | null;
            createdAt: Date;
        };
    }>;
    getOrcidProfile(user: any): Promise<{
        success: boolean;
        data: {
            keywords: any;
            works: any;
            refreshToken: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            orcidId: string;
            accessToken: string | null;
            displayName: string | null;
            biography: string | null;
            lastSyncAt: Date | null;
        } | null;
    }>;
    syncOrcidProfile(user: any, orcidId: string): Promise<{
        success: boolean;
        data: {
            keywords: any;
            works: any[];
            refreshToken: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            orcidId: string;
            accessToken: string | null;
            displayName: string | null;
            biography: string | null;
            lastSyncAt: Date | null;
        } | {
            keywords: never[];
            works: never[];
            syncError: any;
            refreshToken: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            orcidId: string;
            accessToken: string | null;
            displayName: string | null;
            biography: string | null;
            lastSyncAt: Date | null;
        };
    }>;
    findById(id: string): Promise<{
        success: boolean;
        data: {
            orcidProfile: {
                refreshToken: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                orcidId: string;
                accessToken: string | null;
                displayName: string | null;
                biography: string | null;
                keywords: string | null;
                works: string | null;
                lastSyncAt: Date | null;
            } | null;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            avatarUrl: string | null;
            createdAt: Date;
        };
    }>;
    updatePushToken(userId: string, token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    toggleActive(id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            email: string;
            passwordHash: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            avatarUrl: string | null;
            expoPushToken: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
//# sourceMappingURL=users.controller.d.ts.map