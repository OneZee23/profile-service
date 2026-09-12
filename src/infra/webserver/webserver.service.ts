import { INestApplication, Injectable, Logger } from '@nestjs/common';
import { Server } from 'http';
import { WebserverConfig } from '@/infra/webserver/webserver.config';

@Injectable()
export class WebserverService {
  constructor(private readonly config: WebserverConfig) {}

  public async setup(app: INestApplication): Promise<void> {
    await app.listen(this.config.port, '0.0.0.0');

    const server = app.getHttpServer() as Server;
    server.keepAliveTimeout = 100_000;
    server.headersTimeout = 105_000;

    const msg = `Serving ${process.env.NODE_ENV} on ${this.config.publicUrl}`;
    new Logger('Webserver').log(msg);
  }
}
