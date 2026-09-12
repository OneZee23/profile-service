import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/infra/database/database.module';
import { PrismaService } from '@/infra/database/prisma.service';
import {
  ProfileLinkKind,
  ProjectStatus,
  SkillLevel,
} from '@/modules/profile/model';
import { ResumeConfig } from '@/modules/profile/resume.config';
import { ProfileSeedService } from '@/modules/profile/services/profile-seed.service';
import { clearDatabase } from './utils/clear-database.util';

const PROFILE_ID = 'onezee';
const SEED_STATE_ID = 'resume';
const CURRENT_EXPERIENCE_ID = 'onezee:exp:ime-lab-senior-backend-engineer';
const PAST_EXPERIENCE_ID = 'onezee:exp:freelance-backend-engineer';

function buildResume(): ResumeConfig {
  return {
    profile: {
      slug: PROFILE_ID,
      name: 'Nikita Shevelev',
      headline: 'Backend engineer',
      description: 'Builds small, boring, well-documented NestJS services',
      location: 'Belgrade, Serbia',
      timezone: 'Europe/Belgrade',
      available: true,
    },
    links: [
      {
        kind: ProfileLinkKind.GITHUB,
        label: 'GitHub',
        url: 'https://github.com/onezee23',
      },
      {
        kind: ProfileLinkKind.LINKEDIN,
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/onezee',
      },
    ],
    skills: [
      { name: 'NestJS', category: 'Backend', level: SkillLevel.EXPERT },
      { name: 'Prisma', category: 'Backend', level: SkillLevel.STRONG },
      { name: 'PostgreSQL', category: 'Databases', level: SkillLevel.STRONG },
    ],
    experience: [
      {
        company: 'iMe Lab',
        position: 'Senior Backend Engineer',
        companyUrl: 'https://imem.app',
        location: 'Remote',
        startedAt: '2023-01',
        summary: 'Rewards, ads and premium subsystems',
        achievements: [
          'Cut p99 latency by 40%',
          'Shipped the rewards subsystem',
        ],
      },
      {
        company: 'Freelance',
        position: 'Backend Engineer',
        startedAt: '2021-03',
        finishedAt: '2022-12',
        achievements: ['Delivered twelve client APIs'],
      },
    ],
    projects: [
      {
        name: 'Profile Service',
        slug: 'profile-service',
        description: 'This service',
        repositoryUrl: 'https://github.com/onezee23/profile-service',
        status: ProjectStatus.LIVE,
        stack: ['NestJS', 'Prisma', 'GraphQL'],
      },
      {
        name: 'OneZee Landing',
        slug: 'onezee-landing',
        url: 'https://onezee.dev',
        status: ProjectStatus.LIVE,
        stack: ['Astro'],
      },
    ],
  };
}

describe('ProfileSeedService (e2e)', () => {
  const modules: TestingModule[] = [];

  let prisma: PrismaService;
  let seed: ProfileSeedService;

  async function bootstrap(resume: ResumeConfig): Promise<ProfileSeedService> {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        { provide: ResumeConfig, useValue: resume },
        ProfileSeedService,
      ],
    }).compile();

    modules.push(moduleRef);
    prisma = moduleRef.get(PrismaService);

    return moduleRef.get(ProfileSeedService);
  }

  beforeEach(async () => {
    seed = await bootstrap(buildResume());
    await clearDatabase(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);

    for (const moduleRef of modules) {
      await moduleRef.close();
    }

    modules.length = 0;
  });

  describe('sync', () => {
    it('should insert the whole resume on the first run', async () => {
      const outcome = await seed.sync();

      expect(outcome.applied).toBe(true);
      expect(outcome.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(outcome.counts).toEqual({
        links: 2,
        skills: 3,
        experience: 2,
        achievements: 3,
        projects: 2,
      });

      expect(await prisma.profile.count()).toBe(1);
      expect(await prisma.profileLink.count()).toBe(2);
      expect(await prisma.skill.count()).toBe(3);
      expect(await prisma.experience.count()).toBe(2);
      expect(await prisma.achievement.count()).toBe(3);
      expect(await prisma.project.count()).toBe(2);

      const state = await prisma.seedState.findUniqueOrThrow({
        where: { id: SEED_STATE_ID },
      });
      expect(state.checksum).toBe(outcome.checksum);
    });

    it('should write content-derived primary keys', async () => {
      await seed.sync();

      const profile = await prisma.profile.findUniqueOrThrow({
        where: { id: PROFILE_ID },
      });
      expect(profile.slug).toBe(PROFILE_ID);

      const links = await prisma.profileLink.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      expect(links.map((link) => link.id)).toEqual([
        'onezee:link:github',
        'onezee:link:linkedin',
      ]);

      const skills = await prisma.skill.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      expect(skills.map((skill) => skill.id)).toEqual([
        'onezee:skill:nestjs',
        'onezee:skill:prisma',
        'onezee:skill:postgresql',
      ]);

      const experience = await prisma.experience.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      expect(experience.map((entry) => entry.id)).toEqual([
        CURRENT_EXPERIENCE_ID,
        PAST_EXPERIENCE_ID,
      ]);
      expect(experience[0].startedAt).toEqual(
        new Date('2023-01-01T00:00:00.000Z'),
      );
      expect(experience[0].finishedAt).toBeNull();
      expect(experience[1].finishedAt).toEqual(
        new Date('2022-12-01T00:00:00.000Z'),
      );

      const achievements = await prisma.achievement.findMany({
        where: { experienceId: CURRENT_EXPERIENCE_ID },
        orderBy: { sortOrder: 'asc' },
      });
      expect(achievements.map((achievement) => achievement.id)).toEqual([
        `${CURRENT_EXPERIENCE_ID}:ach:d19350a6`,
        `${CURRENT_EXPERIENCE_ID}:ach:2fb2b382`,
      ]);

      const projects = await prisma.project.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      expect(projects.map((project) => project.id)).toEqual([
        'onezee:project:profile-service',
        'onezee:project:onezee-landing',
      ]);
    });

    it('should skip the second run and leave the rows untouched', async () => {
      const first = await seed.sync();

      const profileBefore = await prisma.profile.findUniqueOrThrow({
        where: { id: PROFILE_ID },
      });
      const stateBefore = await prisma.seedState.findUniqueOrThrow({
        where: { id: SEED_STATE_ID },
      });

      const second = await seed.sync();

      expect(second.applied).toBe(false);
      expect(second.checksum).toBe(first.checksum);

      const profileAfter = await prisma.profile.findUniqueOrThrow({
        where: { id: PROFILE_ID },
      });
      const stateAfter = await prisma.seedState.findUniqueOrThrow({
        where: { id: SEED_STATE_ID },
      });

      expect(profileAfter.updatedAt).toEqual(profileBefore.updatedAt);
      expect(stateAfter.appliedAt).toEqual(stateBefore.appliedAt);
    });

    it('should skip a config that differs only in key order', async () => {
      const first = await seed.sync();

      const resume = buildResume();
      const reordered: ResumeConfig = {
        projects: resume.projects,
        experience: resume.experience,
        skills: resume.skills,
        links: resume.links,
        profile: {
          available: resume.profile.available,
          timezone: resume.profile.timezone,
          location: resume.profile.location,
          description: resume.profile.description,
          headline: resume.profile.headline,
          name: resume.profile.name,
          slug: resume.profile.slug,
        },
      };

      const reorderedSeed = await bootstrap(reordered);

      expect(reorderedSeed.checksumOf(reordered)).toBe(first.checksum);

      const outcome = await reorderedSeed.sync();
      expect(outcome.applied).toBe(false);
    });

    it('should delete a project removed from the config', async () => {
      await seed.sync();

      const resume = buildResume();
      const trimmed: ResumeConfig = {
        ...resume,
        projects: [resume.projects[0]],
      };

      const trimmedSeed = await bootstrap(trimmed);
      const outcome = await trimmedSeed.sync();

      expect(outcome.applied).toBe(true);
      expect(outcome.counts.projects).toBe(1);

      const projects = await prisma.project.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      expect(projects.map((project) => project.id)).toEqual([
        'onezee:project:profile-service',
      ]);
    });

    it('should replace a renamed skill with its new content-derived id', async () => {
      await seed.sync();

      const resume = buildResume();
      const renamed: ResumeConfig = {
        ...resume,
        skills: [
          { name: 'Nest.js', category: 'Backend', level: SkillLevel.EXPERT },
          resume.skills[1],
          resume.skills[2],
        ],
      };

      const renamedSeed = await bootstrap(renamed);
      const outcome = await renamedSeed.sync();

      expect(outcome.counts.skills).toBe(3);
      expect(await prisma.skill.count()).toBe(3);
      expect(
        await prisma.skill.findUnique({ where: { id: 'onezee:skill:nestjs' } }),
      ).toBeNull();

      const skills = await prisma.skill.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      expect(skills.map((skill) => skill.id)).toEqual([
        'onezee:skill:nest-js',
        'onezee:skill:prisma',
        'onezee:skill:postgresql',
      ]);
    });

    it('should derive a new achievement id when its text changes', async () => {
      await seed.sync();

      expect(
        await prisma.achievement.findUnique({
          where: { id: `${CURRENT_EXPERIENCE_ID}:ach:2fb2b382` },
        }),
      ).not.toBeNull();

      const resume = buildResume();
      const edited: ResumeConfig = {
        ...resume,
        experience: [
          {
            ...resume.experience[0],
            achievements: [
              'Cut p99 latency by 40%',
              'Rewrote the rewards subsystem',
            ],
          },
          resume.experience[1],
        ],
      };

      const editedSeed = await bootstrap(edited);
      const outcome = await editedSeed.sync();

      expect(outcome.counts.achievements).toBe(3);
      expect(await prisma.achievement.count()).toBe(3);
      expect(
        await prisma.achievement.findUnique({
          where: { id: `${CURRENT_EXPERIENCE_ID}:ach:2fb2b382` },
        }),
      ).toBeNull();
      expect(
        await prisma.achievement.findUniqueOrThrow({
          where: { id: `${CURRENT_EXPERIENCE_ID}:ach:cf7af755` },
        }),
      ).toMatchObject({ text: 'Rewrote the rewards subsystem', sortOrder: 1 });
    });

    it('should cascade-delete achievements with their experience', async () => {
      await seed.sync();

      const resume = buildResume();
      const trimmed: ResumeConfig = {
        ...resume,
        experience: [resume.experience[0]],
      };

      const trimmedSeed = await bootstrap(trimmed);
      const outcome = await trimmedSeed.sync();

      expect(outcome.counts.experience).toBe(1);
      expect(outcome.counts.achievements).toBe(2);
      expect(await prisma.experience.count()).toBe(1);
      expect(await prisma.achievement.count()).toBe(2);
      expect(
        await prisma.achievement.findMany({
          where: { experienceId: PAST_EXPERIENCE_ID },
        }),
      ).toEqual([]);
    });
  });

  describe('colliding content-derived ids', () => {
    it('should name both entries instead of failing on a constraint', async () => {
      const colliding = buildResume();
      colliding.skills.push(
        { name: 'Node.js', category: 'Backend', level: SkillLevel.STRONG },
        { name: 'Node JS', category: 'Backend', level: SkillLevel.STRONG },
      );

      const seedService = await bootstrap(colliding);

      await expect(seedService.sync()).rejects.toThrow(
        'Two skills entries derive the same id "onezee:skill:node-js"',
      );
    });
  });

  describe('profile rename', () => {
    it('should not strand the previous profile when the slug changes', async () => {
      await seed.sync();

      const base = buildResume();
      const renamed: ResumeConfig = {
        ...base,
        profile: { ...base.profile, slug: 'renamed' },
      };
      const renamedSeed = await bootstrap(renamed);
      await renamedSeed.sync();

      expect(
        await prisma.profile.findUnique({ where: { slug: PROFILE_ID } }),
      ).toBeNull();
      expect(
        await prisma.profile.findUnique({ where: { slug: 'renamed' } }),
      ).not.toBeNull();
      expect(await prisma.profile.count()).toBe(1);
      expect(
        await prisma.skill.count({ where: { profileId: PROFILE_ID } }),
      ).toBe(0);
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should reconcile the resume on boot', async () => {
      await seed.onApplicationBootstrap();

      expect(await prisma.profile.count()).toBe(1);
      expect(await prisma.achievement.count()).toBe(3);
      expect(
        (
          await prisma.seedState.findUniqueOrThrow({
            where: { id: SEED_STATE_ID },
          })
        ).checksum,
      ).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
