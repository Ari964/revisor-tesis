import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
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
    }>;
    findById(id: string): Promise<{
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
    }>;
    updateExpoPushToken(userId: string, expoPushToken: string): Promise<{
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
    }>;
    toggleActive(id: string): Promise<{
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
    }>;
    getOrcidProfile(userId: string): Promise<{
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
    } | null>;
    syncOrcidProfile(userId: string, orcidId: string): Promise<{
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
    }>;
}
//# sourceMappingURL=users.service.d.ts.map