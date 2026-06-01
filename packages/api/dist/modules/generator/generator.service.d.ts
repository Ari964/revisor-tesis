import { ConfigService } from '@nestjs/config';
export declare class GeneratorService {
    private configService;
    private apiKey;
    private apiModel;
    constructor(configService: ConfigService);
    private cleanJsonString;
    private callGemini;
    initThesis(tema: string, customMetadata?: any): Promise<any>;
    generateStep(stepIndex: number, currentData: any): Promise<any>;
    exportThesis(thesisData: any, format: string): Promise<Buffer>;
}
//# sourceMappingURL=generator.service.d.ts.map