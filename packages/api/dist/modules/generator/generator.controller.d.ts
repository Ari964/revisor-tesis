import { Response } from 'express';
import { GeneratorService } from './generator.service';
export declare class GeneratorController {
    private readonly generatorService;
    constructor(generatorService: GeneratorService);
    initThesis(body: {
        tema: string;
        metadata?: any;
    }): Promise<{
        success: boolean;
        data: any;
    }>;
    generateStep(body: {
        stepIndex: number;
        currentData: any;
    }): Promise<{
        success: boolean;
        data: any;
    }>;
    exportThesis(body: {
        thesisData: any;
        format: string;
    }, res: Response): Promise<void>;
}
//# sourceMappingURL=generator.controller.d.ts.map