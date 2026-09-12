import { createHash } from 'crypto';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/database/prisma.service';
import { canonicalJson } from '@/utils/canonical-json';
import { parseResumeDate } from '@/utils/resume-date';
import { slugify } from '@/utils/slugify';
import { ResumeConfig } from '../resume.config';

export type SeedCounts = {
  links: number;
  skills: number;
  experience: number;
  achievements: number;
  projects: number;
};

export type SeedOutcome = {
  applied: boolean;
  checksum: string;
  counts: SeedCounts;
};

const SEED_STATE_ID = 'resume';
const TRANSACTION_TIMEOUT_MS = 30_000;

function resumeDate(value: string): Date {
  const parsed = parseResumeDate(value);
  if (!parsed) throw new Error(`Resume date "${value}" is not a calendar date`);

  return parsed;
}

function assertDistinctIds(rows: { id: string }[], collection: string): void {
  const seen = new Set<string>();

  for (const { id } of rows) {
    if (seen.has(id)) {
      throw new Error(
        `Two ${collection} entries derive the same id "${id}". ` +
          'Their names differ only by punctuation or case — rename one.',
      );
    }
    seen.add(id);
  }
}

async function recordChecksum(
  tx: Prisma.TransactionClient,
  checksum: string,
): Promise<void> {
  await tx.seedState.upsert({
    where: { id: SEED_STATE_ID },
    create: { id: SEED_STATE_ID, checksum, appliedAt: new Date() },
    update: { checksum, appliedAt: new Date() },
  });
}

function achievementHash(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 8);
}

@Injectable()
export class ProfileSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProfileSeedService.name);

  constructor(
    private readonly config: ResumeConfig,
    private readonly prisma: PrismaService,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    const outcome = await this.sync();
    const { links, skills, experience, achievements, projects } =
      outcome.counts;

    this.logger.log(
      `Resume seed ${outcome.applied ? 'applied' : 'skipped'}: ` +
        `${links} links, ${skills} skills, ${experience} experience, ` +
        `${achievements} achievements, ${projects} projects ` +
        `(checksum ${outcome.checksum.slice(0, 12)})`,
    );
  }

  public checksumOf(config: ResumeConfig): string {
    return createHash('sha256').update(canonicalJson(config)).digest('hex');
  }

  public async sync(): Promise<SeedOutcome> {
    const checksum = this.checksumOf(this.config);

    return this.prisma.$transaction(
      async (tx) => {
        const state = await tx.seedState.findUnique({
          where: { id: SEED_STATE_ID },
        });

        if (state?.checksum === checksum) {
          this.logger.log('Resume content is up to date');

          return { applied: false, checksum, counts: this.contentCounts() };
        }

        await this.reconcile(tx, checksum);

        return { applied: true, checksum, counts: this.contentCounts() };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }

  private contentCounts(): SeedCounts {
    return {
      links: this.config.links.length,
      skills: this.config.skills.length,
      experience: this.config.experience.length,
      achievements: this.config.experience.reduce(
        (total, entry) => total + entry.achievements.length,
        0,
      ),
      projects: this.config.projects.length,
    };
  }

  private async reconcile(
    tx: Prisma.TransactionClient,
    checksum: string,
  ): Promise<void> {
    const profileId = this.config.profile.slug;

    await this.writeProfile(tx, profileId);
    await this.deleteOtherProfiles(tx, profileId);
    await this.replaceLinks(tx, profileId);
    await this.replaceSkills(tx, profileId);

    const experienceIds = await this.replaceExperience(tx, profileId);

    await this.replaceAchievements(tx, experienceIds);
    await this.replaceProjects(tx, profileId);
    await recordChecksum(tx, checksum);
  }

  private async writeProfile(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<void> {
    const entry = this.config.profile;
    const row = {
      slug: entry.slug,
      name: entry.name,
      headline: entry.headline,
      description: entry.description,
      location: entry.location ?? null,
      timezone: entry.timezone ?? null,
      available: entry.available,
    };

    await tx.profile.upsert({
      where: { id: profileId },
      create: { id: profileId, ...row },
      update: row,
    });
  }

  private async deleteOtherProfiles(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<void> {
    await tx.profile.deleteMany({ where: { id: { not: profileId } } });
  }

  private async replaceLinks(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<void> {
    const rows = this.config.links.map((entry, index) => ({
      id: `${profileId}:link:${slugify(entry.label)}`,
      profileId,
      kind: entry.kind,
      label: entry.label,
      url: entry.url,
      sortOrder: index,
    }));

    assertDistinctIds(rows, 'links');

    await tx.profileLink.deleteMany({ where: { profileId } });
    await tx.profileLink.createMany({ data: rows });
  }

  private async replaceSkills(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<void> {
    const rows = this.config.skills.map((entry, index) => ({
      id: `${profileId}:skill:${slugify(entry.name)}`,
      profileId,
      name: entry.name,
      category: entry.category,
      level: entry.level,
      sortOrder: index,
    }));

    assertDistinctIds(rows, 'skills');

    await tx.skill.deleteMany({ where: { profileId } });
    await tx.skill.createMany({ data: rows });
  }

  private async replaceExperience(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<string[]> {
    const rows = this.config.experience.map((entry, index) => ({
      id: `${profileId}:exp:${slugify(entry.company)}-${slugify(entry.position)}`,
      profileId,
      company: entry.company,
      position: entry.position,
      companyUrl: entry.companyUrl ?? null,
      location: entry.location ?? null,
      startedAt: resumeDate(entry.startedAt),
      finishedAt: entry.finishedAt ? resumeDate(entry.finishedAt) : null,
      summary: entry.summary ?? null,
      sortOrder: index,
    }));

    assertDistinctIds(rows, 'experience');

    await tx.experience.deleteMany({ where: { profileId } });
    await tx.experience.createMany({ data: rows });

    return rows.map((row) => row.id);
  }

  private async replaceAchievements(
    tx: Prisma.TransactionClient,
    experienceIds: string[],
  ): Promise<void> {
    const rows = this.config.experience.flatMap((entry, index) =>
      entry.achievements.map((text, achievementIndex) => ({
        id: `${experienceIds[index]}:ach:${achievementHash(text)}`,
        experienceId: experienceIds[index],
        text,
        sortOrder: achievementIndex,
      })),
    );

    assertDistinctIds(rows, 'achievement');

    await tx.achievement.deleteMany({
      where: { experienceId: { in: experienceIds } },
    });
    await tx.achievement.createMany({ data: rows });
  }

  private async replaceProjects(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<void> {
    const rows = this.config.projects.map((entry, index) => ({
      id: `${profileId}:project:${entry.slug}`,
      profileId,
      name: entry.name,
      slug: entry.slug,
      description: entry.description ?? null,
      url: entry.url ?? null,
      repositoryUrl: entry.repositoryUrl ?? null,
      status: entry.status,
      stack: entry.stack,
      sortOrder: index,
    }));

    assertDistinctIds(rows, 'projects');

    await tx.project.deleteMany({ where: { profileId } });
    await tx.project.createMany({ data: rows });
  }
}
