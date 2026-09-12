import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseConfig } from './database.config';

type QueryLoggingOptions = {
  datasourceUrl: string;
  log: [{ emit: 'event'; level: 'query' }];
};

@Injectable()
export class PrismaService
  extends PrismaClient<QueryLoggingOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: DatabaseConfig) {
    super({
      datasourceUrl: config.url(),
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.config.logQueries) {
      this.$on('query', (event) =>
        this.logger.debug(`${event.query} — ${event.duration}ms`),
      );
    }

    await this.$connect();
    this.logger.log(
      `Connected to ${this.config.database} at ${this.config.host}:${this.config.port}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
