import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PatternsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        name: string;
        description?: string;
        version?: string;
        structure: any;
        isDefault?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        version: string;
        structure: string;
        isDefault: boolean;
    }>;
    findAll(): Promise<{
        structure: any;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        version: string;
        isDefault: boolean;
    }[]>;
    findById(id: string): Promise<{
        structure: any;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        version: string;
        isDefault: boolean;
    }>;
    update(id: string, data: Partial<{
        name: string;
        description: string;
        version: string;
        structure: any;
        isDefault: boolean;
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        version: string;
        structure: string;
        isDefault: boolean;
    }>;
    getDefault(): Promise<{
        structure: any;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        version: string;
        isDefault: boolean;
    }>;
}
//# sourceMappingURL=patterns.service.d.ts.map