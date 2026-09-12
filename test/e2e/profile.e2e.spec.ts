import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '@/infra/database/prisma.service';
import {
  ProfileLinkKind,
  ProjectStatus,
  SkillLevel,
} from '@/modules/profile/model';
import { ResumeConfig } from '@/modules/profile/resume.config';
import { AppModule } from '../../src/app.module';
import { clearDatabase } from './utils/clear-database.util';
import { countQueries, QueryCounter } from './utils/count-queries.util';

const RESUME: ResumeConfig = {
  profile: {
    slug: 'e2e',
    name: 'Ada Tester',
    headline: 'Senior Backend Engineer',
    description: 'Builds backends for the test suite.',
    location: 'Testville',
    timezone: 'UTC',
    available: true,
  },
  links: [
    {
      kind: ProfileLinkKind.WEBSITE,
      label: 'Website',
      url: 'https://example.test',
    },
    {
      kind: ProfileLinkKind.GITHUB,
      label: 'GitHub',
      url: 'https://github.com/example',
    },
  ],
  skills: [
    { name: 'NestJS', category: 'Backend', level: SkillLevel.EXPERT },
    { name: 'PostgreSQL', category: 'Backend', level: SkillLevel.STRONG },
    { name: 'Kubernetes', category: 'Infra', level: SkillLevel.FAMILIAR },
  ],
  experience: [
    {
      company: 'Acme',
      position: 'Senior Backend Engineer',
      startedAt: '2021-01',
      finishedAt: '2026-06',
      achievements: ['Built the gateway', 'Owned the payments platform'],
    },
    {
      company: 'Globex',
      position: 'Backend Engineer',
      startedAt: '2019-01',
      finishedAt: '2020-12',
      achievements: ['Shipped the billing service'],
    },
    {
      company: 'Initech',
      position: 'Junior Backend Engineer',
      startedAt: '2018-01',
      finishedAt: '2018-12',
      achievements: [
        'Wrote the import job',
        'Cut the nightly batch in half',
        'Added tracing',
      ],
    },
  ],
  projects: [
    {
      name: 'TripTrack',
      slug: 'trip-track',
      description: 'Road-trip tracker',
      url: 'https://example.test/trip',
      status: ProjectStatus.LIVE,
      stack: ['Swift', 'NestJS'],
    },
    {
      name: 'LifeTrack',
      slug: 'life-track',
      description: 'Habit tracker',
      url: 'https://example.test/life',
      status: ProjectStatus.LIVE,
      stack: ['SwiftUI'],
    },
  ],
};

describe('Profile (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let counter: QueryCounter;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ResumeConfig)
      .useValue(RESUME)
      .compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    counter = countQueries(prisma);

    await clearDatabase(prisma);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  describe('query profile', () => {
    it('should return the profile with its skills, experience and projects', async () => {
      const query = `
        query {
          profile {
            name
            description
            skills { name }
            experience { company position }
            projects { name }
          }
        }
      `;

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(HttpStatus.OK);

      expect(res.body.data).toEqual({
        profile: {
          name: 'Ada Tester',
          description: 'Builds backends for the test suite.',
          skills: [
            { name: 'NestJS' },
            { name: 'PostgreSQL' },
            { name: 'Kubernetes' },
          ],
          experience: [
            { company: 'Acme', position: 'Senior Backend Engineer' },
            { company: 'Globex', position: 'Backend Engineer' },
            { company: 'Initech', position: 'Junior Backend Engineer' },
          ],
          projects: [{ name: 'TripTrack' }, { name: 'LifeTrack' }],
        },
      });
    });

    it('should batch achievements into a single query for three experiences', async () => {
      const query = `
        query {
          profile {
            experience {
              achievements { text }
            }
          }
        }
      `;

      await counter.startCounting();

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(HttpStatus.OK);

      await counter.settle();

      expect(res.body.data).toEqual({
        profile: {
          experience: [
            {
              achievements: [
                { text: 'Built the gateway' },
                { text: 'Owned the payments platform' },
              ],
            },
            {
              achievements: [{ text: 'Shipped the billing service' }],
            },
            {
              achievements: [
                { text: 'Wrote the import job' },
                { text: 'Cut the nightly batch in half' },
                { text: 'Added tracing' },
              ],
            },
          ],
        },
      });

      expect(counter.queries).toHaveLength(3);
    });

    it('should return ERR_PROFILE_NOT_FOUND for an unknown slug', async () => {
      const query = `
        query {
          profile(slug: "nope") {
            name
          }
        }
      `;

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(HttpStatus.OK);

      expect(res.body.errors[0].extensions.code).toBe('ERR_PROFILE_NOT_FOUND');
      expect(res.body.errors[0].extensions.payload).toEqual({ slug: 'nope' });
    });

    it('should filter skills by category', async () => {
      const query = `
        query {
          profile {
            skills(filter: { category: "Backend" }) { name }
          }
        }
      `;

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(HttpStatus.OK);

      expect(res.body.data).toEqual({
        profile: {
          skills: [{ name: 'NestJS' }, { name: 'PostgreSQL' }],
        },
      });
    });

    it('should filter skills by level', async () => {
      const query = `
        query {
          profile {
            skills(filter: { level: EXPERT }) { name }
          }
        }
      `;

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(HttpStatus.OK);

      expect(res.body.data).toEqual({
        profile: {
          skills: [{ name: 'NestJS' }],
        },
      });
    });
  });
});
