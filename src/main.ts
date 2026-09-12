import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WebserverService } from '@/infra/webserver/webserver.service';
import { getLogLevels } from '@/utils/env';
import 'reflect-metadata';
import 'source-map-support/register';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: getLogLevels(),
  });
  app.enableShutdownHooks();
  await app.get(WebserverService).setup(app);
}

bootstrap().catch((thrown) => {
  new Logger('Bootstrap').error(thrown);
  process.exit(1);
});

/* eslint-disable no-console */
process.on('uncaughtException', (thrown) => {
  console.error(thrown);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(reason, promise);
  process.exit(1);
});
/* eslint-enable no-console */
