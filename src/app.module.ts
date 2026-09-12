import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infra/database/database.module';
import { GraphqlModule } from '@/infra/graphql/graphql.module';
import { WebserverModule } from '@/infra/webserver/webserver.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [DatabaseModule, WebserverModule, GraphqlModule, ProfileModule],
})
export class AppModule {}
