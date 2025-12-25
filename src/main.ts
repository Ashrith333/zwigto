import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import * as dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

// Verify JWT config is available
import { JwtConfig } from './auth/config/jwt.config';
JwtConfig.initialize();
const jwtStatus = JwtConfig.verify();
console.log('🔐 JWT Configuration Status:', jwtStatus);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use('/payments/webhook', express.raw({ type: 'application/json' }));

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();

