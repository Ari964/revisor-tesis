import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucketDocuments: string;
  private bucketPatterns: string;

  constructor(private config: ConfigService) {
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

  private async ensureBucket(name: string) {
    const exists = await this.client.bucketExists(name);
    if (!exists) {
      await this.client.makeBucket(name);
    }
  }

  async uploadDocument(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const key = `documents/${Date.now()}-${fileName}`;
    await this.client.putObject(this.bucketDocuments, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return key;
  }

  async getDocument(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucketDocuments, key);
    return this.streamToBuffer(stream);
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucketDocuments, key, expirySeconds);
  }

  async deleteDocument(key: string): Promise<void> {
    await this.client.removeObject(this.bucketDocuments, key);
  }

  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
