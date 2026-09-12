import { Global, Module } from '@nestjs/common';
import { provideConfig } from '@/utils/config';
import { DatabaseConfig } from './database.config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [provideConfig(DatabaseConfig), PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
