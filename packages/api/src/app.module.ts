import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ThesisModule } from './modules/thesis/thesis.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PatternsModule } from './modules/patterns/patterns.module';
import { ReviewModule } from './modules/review/review.module';
import { PlagiarismModule } from './modules/plagiarism/plagiarism.module';
import { CitationsModule } from './modules/citations/citations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { GeneratorModule } from './modules/generator/generator.module';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // BullMQ — Conexión a Redis para colas
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // Módulos base
    PrismaModule,
    StorageModule,

    // Módulos funcionales
    AuthModule,
    UsersModule,
    ThesisModule,
    DocumentsModule,
    PatternsModule,
    ReviewModule,
    PlagiarismModule,
    CitationsModule,
    DashboardModule,
    NotificationsModule,
    GeneratorModule,
  ],
})
export class AppModule {}
