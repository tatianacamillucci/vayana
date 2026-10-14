import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static test UI from /public
  app.useStaticAssets(join(__dirname, '..', '..', 'public'), { prefix: '/ui/' });

  // Cookie parser for JWT in HTTP-only cookies
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vayana API')
    .setDescription('Project management API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // CORS for frontend
  const frontendUrl = configService.get<string>('frontend.url');
  app.enableCors({
    origin: frontendUrl || 'http://localhost:5173',
    credentials: true,
  });

  const port = configService.get<number>('port') || 4000;
  await app.listen(port);
}
bootstrap();
