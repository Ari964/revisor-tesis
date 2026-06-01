import { PatternsService } from './patterns.service';
export declare class PatternsController {
    private patternsService;
    constructor(patternsService: PatternsService);
    create(body: any): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            version: string;
            structure: string;
            isDefault: boolean;
        };
    }>;
    findAll(): Promise<{
        success: boolean;
        data: {
            structure: any;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            version: string;
            isDefault: boolean;
        }[];
    }>;
    getDefault(): Promise<{
        success: boolean;
        data: {
            structure: any;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            version: string;
            isDefault: boolean;
        };
    }>;
    findById(id: string): Promise<{
        success: boolean;
        data: {
            structure: any;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            version: string;
            isDefault: boolean;
        };
    }>;
    update(id: string, body: any): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            version: string;
            structure: string;
            isDefault: boolean;
        };
    }>;
}
//# sourceMappingURL=patterns.controller.d.ts.map