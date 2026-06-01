import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class MinioService implements OnModuleInit {
    private config;
    private client;
    private bucketDocuments;
    private bucketPatterns;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    private ensureBucket;
    uploadDocument(fileName: string, buffer: Buffer, mimeType: string): Promise<string>;
    getDocument(key: string): Promise<Buffer>;
    getPresignedUrl(key: string, expirySeconds?: number): Promise<string>;
    deleteDocument(key: string): Promise<void>;
    private streamToBuffer;
}
//# sourceMappingURL=minio.service.d.ts.map