import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable flexible CORS for local development and deployed frontend (Vercel, etc.)
  const corsOrigin = configService.get('CORS_ORIGIN') || configService.get('FRONTEND_URL');
  let originConfig: any = true;

  if (corsOrigin && corsOrigin !== '*') {
    if (corsOrigin.includes(',')) {
      originConfig = corsOrigin.split(',').map((o: string) => o.trim());
    } else {
      originConfig = [corsOrigin, 'http://localhost:3000', 'http://localhost:3001'];
    }
  }

  app.enableCors({
    origin: originConfig,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  });

  // Serve uploads statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = parseInt(configService.get('PORT') || '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
