"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_module_1 = require("./common/prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const thesis_module_1 = require("./modules/thesis/thesis.module");
const documents_module_1 = require("./modules/documents/documents.module");
const patterns_module_1 = require("./modules/patterns/patterns.module");
const review_module_1 = require("./modules/review/review.module");
const plagiarism_module_1 = require("./modules/plagiarism/plagiarism.module");
const citations_module_1 = require("./modules/citations/citations.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const storage_module_1 = require("./modules/storage/storage.module");
const generator_module_1 = require("./modules/generator/generator.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            // Configuración global
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '../../.env',
            }),
            // BullMQ — Conexión a Redis para colas
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                    password: process.env.REDIS_PASSWORD,
                },
            }),
            // Módulos base
            prisma_module_1.PrismaModule,
            storage_module_1.StorageModule,
            // Módulos funcionales
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            thesis_module_1.ThesisModule,
            documents_module_1.DocumentsModule,
            patterns_module_1.PatternsModule,
            review_module_1.ReviewModule,
            plagiarism_module_1.PlagiarismModule,
            citations_module_1.CitationsModule,
            dashboard_module_1.DashboardModule,
            notifications_module_1.NotificationsModule,
            generator_module_1.GeneratorModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map