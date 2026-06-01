"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Prefijo global de API
    app.setGlobalPrefix('api');
    // Validación global de DTOs
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    // CORS para Next.js y Expo
    app.enableCors({
        origin: [
            'http://localhost:3000', // Next.js
            'http://localhost:8081', // Expo
            'exp://localhost:8081',
        ],
        credentials: true,
    });
    const port = process.env.API_PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Revisor de Tesis API corriendo en http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map