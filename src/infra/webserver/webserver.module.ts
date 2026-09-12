import { Global, Module } from '@nestjs/common';
import { HealthController } from '@/infra/webserver/health.controller';
import { WebserverConfig } from '@/infra/webserver/webserver.config';
import { WebserverService } from '@/infra/webserver/webserver.service';
import { provideConfig } from '@/utils/config';

@Global()
@Module({
  providers: [provideConfig(WebserverConfig), WebserverService],
  controllers: [HealthController],
  exports: [WebserverService],
})
export class WebserverModule {}
