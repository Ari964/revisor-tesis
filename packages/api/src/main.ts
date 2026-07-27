import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS para Next.js y Expo
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [configService.get<string>('FRONTEND_URL') || 'http://localhost:3000']
        : true,
    credentials: true,
  });

  const port = configService.get<number>('API_PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 Revisor de Tesis API corriendo en http://localhost:${port}/api`);
}
bootstrap();
