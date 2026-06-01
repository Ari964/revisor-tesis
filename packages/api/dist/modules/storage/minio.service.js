"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Minio = __importStar(require("minio"));
let MinioService = class MinioService {
    config;
    client;
    bucketDocuments;
    bucketPatterns;
    constructor(config) {
        this.config = config;
        this.client = new Minio.Client({
            endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
            port: parseInt(this.config.get('MINIO_PORT', '9000'), 10),
            useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
            accessKey: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
            secretKey: this.config.get('MINIO_SECRET_KEY', 'minio_secret_2025'),
        });
        this.bucketDocuments = this.config.get('MINIO_BUCKET_DOCUMENTS', 'thesis-documents');
        this.bucketPatterns = this.config.get('MINIO_BUCKET_PATTERNS', 'thesis-patterns');
    }
    async onModuleInit() {
        // Asegurar que los buckets existen
        await this.ensureBucket(this.bucketDocuments);
        await this.ensureBucket(this.bucketPatterns);
        console.log('✅ MinIO conectado y buckets verificados');
    }
    async ensureBucket(name) {
        const exists = await this.client.bucketExists(name);
        if (!exists) {
            await this.client.makeBucket(name);
        }
    }
    async uploadDocument(fileName, buffer, mimeType) {
        const key = `documents/${Date.now()}-${fileName}`;
        await this.client.putObject(this.bucketDocuments, key, buffer, buffer.length, {
            'Content-Type': mimeType,
        });
        return key;
    }
    async getDocument(key) {
        const stream = await this.client.getObject(this.bucketDocuments, key);
        return this.streamToBuffer(stream);
    }
    async getPresignedUrl(key, expirySeconds = 3600) {
        return this.client.presignedGetObject(this.bucketDocuments, key, expirySeconds);
    }
    async deleteDocument(key) {
        await this.client.removeObject(this.bucketDocuments, key);
    }
    streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }
};
exports.MinioService = MinioService;
exports.MinioService = MinioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MinioService);
//# sourceMappingURL=minio.service.js.map