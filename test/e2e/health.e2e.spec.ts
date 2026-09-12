import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('route /health/check', () => {
    it('should return the liveness string', async () => {
      await request(app.getHttpServer())
        .get('/health/check')
        .expect(HttpStatus.OK)
        .expect('I am ok');
    });

    it('should not answer on the bare /health path', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
