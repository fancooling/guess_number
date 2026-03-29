import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors();

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
