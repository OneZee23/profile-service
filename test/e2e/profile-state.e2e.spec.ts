import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/infra/database/database.module';
import { PrismaService } from '@/infra/database/prisma.service';
import { ProfileLinkKind, ProjectStatus, SkillLevel } from '@/modules/profile/model';
import { ProfileStateService } from '@/modules/profile/services/profile-state.service';
import { clearDatabase } from './utils/clear-database.util';

const PROFILE_ID = 'onezee';
const CURRENT_EXPERIENCE_ID = 'onezee:exp:ime-lab-senior-backend-engineer';
const PAST_EXPERIENCE_ID = 'onezee:exp:freelance-backend-engineer';

async function insertFixture(prisma: PrismaService): Promise<void> {
  await prisma.profile.create({
    data: {
      id: PROFILE_ID,
      slug: PROFILE_ID,
      name: 'Nikita Shevelev',
      headline: 'Backend engineer',
      description: 'Builds small, boring, well-documented NestJS services',
      location: 'Belgrade, Serbia',
      timezone: 'Europe/Belgrade',
      available: true,
    },
  });

  await prisma.profileLink.createMany({
    data: [
      {
        id: 'onezee:link:github',
        profileId: PROFILE_ID,
        kind: ProfileLinkKind.GITHUB,
        label: 'GitHub',
        url: 'https://github.com/onezee23',
        sortOrder: 2,
      },
      {
        id: 'onezee:link:linkedin',
        profileId: PROFILE_ID,
        kind: ProfileLinkKind.LINKEDIN,
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/onezee',
        sortOrder: 0,
      },
      {
        id: 'onezee:link:website',
        profileId: PROFILE_ID,
        kind: ProfileLinkKind.WEBSITE,
        label: 'Website',
        url: 'https://onezee.dev',
        sortOrder: 1,
      },
    ],
  });

  await prisma.skill.createMany({
    data: [
      {
        id: 'onezee:skill:nestjs',
        profileId: PROFILE_ID,
        name: 'NestJS',
        category: 'Backend',
        level: SkillLevel.EXPERT,
        sortOrder: 1,
      },
      {
        id: 'onezee:skill:prisma',
        profileId: PROFILE_ID,
        name: 'Prisma',
        category: 'Backend',
        level: SkillLevel.STRONG,
        sortOrder: 0,
      },
      {
        id: 'onezee:skill:postgresql',
        profileId: PROFILE_ID,
        name: 'PostgreSQL',
        category: 'Databases',
        level: SkillLevel.STRONG,
        sortOrder: 2,
      },
    ],
  });

  await prisma.experience.createMany({
    data: [
      {
        id: PAST_EXPERIENCE_ID,
        profileId: PROFILE_ID,
        company: 'Freelance',
        position: 'Backend Engineer',
        startedAt: new Date('2021-03-01'),
        finishedAt: new Date('2022-12-01'),
        sortOrder: 1,
      },
      {
        id: CURRENT_EXPERIENCE_ID,
        profileId: PROFILE_ID,
        company: 'iMe Lab',
        position: 'Senior Backend Engineer',
        companyUrl: 'https://imem.app',
        location: 'Remote',
        startedAt: new Date('2023-01-01'),
        finishedAt: null,
        summary: 'Rewards, ads and premium subsystems',
        sortOrder: 0,
      },
    ],
  });

  await prisma.achievement.createMany({
    data: [
      {
        id: `${CURRENT_EXPERIENCE_ID}:ach:d19350a6`,
        experienceId: CURRENT_EXPERIENCE_ID,
        text: 'Cut p99 latency by 40%',
        sortOrder: 1,
      },
      {
        id: `${CURRENT_EXPERIENCE_ID}:ach:2fb2b382`,
        experienceId: CURRENT_EXPERIENCE_ID,
        text: 'Shipped the rewards subsystem',
        sortOrder: 0,
      },
      {
        id: `${PAST_EXPERIENCE_ID}:ach:5df871e1`,
        experienceId: PAST_EXPERIENCE_ID,
        text: 'Delivered twelve client APIs',
        sortOrder: 0,
      },
    ],
  });

  await prisma.project.createMany({
    data: [
      {
        id: 'onezee:project:profile-service',
        profileId: PROFILE_ID,
        name: 'Profile Service',
        slug: 'profile-service',
        description: 'This service',
        repositoryUrl: 'https://github.com/onezee23/profile-service',
        status: ProjectStatus.LIVE,
        stack: ['NestJS', 'Prisma', 'GraphQL'],
        sortOrder: 1,
      },
      {
        id: 'onezee:project:onezee-landing',
        profileId: PROFILE_ID,
        name: 'OneZee Landing',
        slug: 'onezee-landing',
        url: 'https://onezee.dev',
        status: ProjectStatus.LIVE,
        stack: ['Astro'],
        sortOrder: 0,
      },
    ],
  });
}

describe('ProfileStateService (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let state: ProfileStateService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [ProfileStateService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    state = moduleRef.get(ProfileStateService);

    await clearDatabase(prisma);
    await insertFixture(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);
    await moduleRef.close();
  });

  describe('findProfileBySlug', () => {
    it('should return the profile for a known slug', async () => {
      const profile = await state.findProfileBySlug(PROFILE_ID);

      expect(profile?.id).toBe(PROFILE_ID);
      expect(profile?.name).toBe('Nikita Shevelev');
      expect(profile?.available).toBe(true);
    });

    it('should return null for an unknown slug', async () => {
      expect(await state.findProfileBySlug('nobody')).toBeNull();
    });
  });

  describe('findLinksByProfileId', () => {
    it('should order links by sortOrder', async () => {
      const links = await state.findLinksByProfileId(PROFILE_ID);

      expect(links.map((link) => link.label)).toEqual(['LinkedIn', 'Website', 'GitHub']);
      expect(links.map((link) => link.sortOrder)).toEqual([0, 1, 2]);
    });
  });

  describe('findSkillsByProfileId', () => {
    it('should order skills by sortOrder', async () => {
      const skills = await state.findSkillsByProfileId(PROFILE_ID);

      expect(skills.map((skill) => skill.name)).toEqual(['Prisma', 'NestJS', 'PostgreSQL']);
    });

    it('should filter skills by category and keep the order', async () => {
      const skills = await state.findSkillsByProfileId(PROFILE_ID, { category: 'Backend' });

      expect(skills.map((skill) => skill.name)).toEqual(['Prisma', 'NestJS']);
    });

    it('should filter skills by level', async () => {
      const skills = await state.findSkillsByProfileId(PROFILE_ID, { level: SkillLevel.EXPERT });

      expect(skills.map((skill) => skill.name)).toEqual(['NestJS']);
    });

    it('should ignore an empty filter', async () => {
      const skills = await state.findSkillsByProfileId(PROFILE_ID, {});

      expect(skills).toHaveLength(3);
    });
  });

  describe('findExperienceByProfileId', () => {
    it('should order experience by sortOrder', async () => {
      const experience = await state.findExperienceByProfileId(PROFILE_ID);

      expect(experience.map((entry) => entry.id)).toEqual([
        CURRENT_EXPERIENCE_ID,
        PAST_EXPERIENCE_ID,
      ]);
      expect(experience[0].position).toBe('Senior Backend Engineer');
      expect(experience[0].finishedAt).toBeNull();
    });
  });

  describe('findProjectsByProfileId', () => {
    it('should order projects by sortOrder', async () => {
      const projects = await state.findProjectsByProfileId(PROFILE_ID);

      expect(projects.map((project) => project.slug)).toEqual([
        'onezee-landing',
        'profile-service',
      ]);
      expect(projects[1].stack).toEqual(['NestJS', 'Prisma', 'GraphQL']);
    });
  });

  describe('findAchievementsByExperienceIds', () => {
    it('should load achievements for many experiences in one batched read', async () => {
      const experienceIds: readonly string[] = [
        CURRENT_EXPERIENCE_ID,
        PAST_EXPERIENCE_ID,
        'onezee:exp:missing',
      ];

      const achievements = await state.findAchievementsByExperienceIds(experienceIds);

      expect(achievements).toHaveLength(3);
      expect(achievements.map((achievement) => achievement.sortOrder)).toEqual([0, 0, 1]);

      const current = achievements.filter(
        (achievement) => achievement.experienceId === CURRENT_EXPERIENCE_ID,
      );
      expect(current.map((achievement) => achievement.text)).toEqual([
        'Shipped the rewards subsystem',
        'Cut p99 latency by 40%',
      ]);

      const past = achievements.filter(
        (achievement) => achievement.experienceId === PAST_EXPERIENCE_ID,
      );
      expect(past.map((achievement) => achievement.text)).toEqual(['Delivered twelve client APIs']);
    });

    it('should return nothing for an unknown experience id', async () => {
      expect(await state.findAchievementsByExperienceIds(['onezee:exp:missing'])).toEqual([]);
    });

    it('should return nothing for an empty key set', async () => {
      expect(await state.findAchievementsByExperienceIds([])).toEqual([]);
    });
  });
});
