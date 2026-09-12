import { Injectable } from '@nestjs/common';
import {
  Achievement as AchievementRow,
  Experience as ExperienceRow,
  Profile as ProfileRow,
  ProfileLink as ProfileLinkRow,
  Project as ProjectRow,
  Skill as SkillRow,
} from '@prisma/client';
import { PrismaService } from '@/infra/database/prisma.service';
import { SkillLevel } from '../model';

export type SkillFilter = {
  category?: string;
  level?: SkillLevel;
};

@Injectable()
export class ProfileStateService {
  constructor(private readonly prisma: PrismaService) {}

  public async findProfileBySlug(slug: string): Promise<ProfileRow | null> {
    return this.prisma.profile.findUnique({ where: { slug } });
  }

  public async findLinksByProfileId(
    profileId: string,
  ): Promise<ProfileLinkRow[]> {
    return this.prisma.profileLink.findMany({
      where: { profileId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  public async findSkillsByProfileId(
    profileId: string,
    filter?: SkillFilter,
  ): Promise<SkillRow[]> {
    return this.prisma.skill.findMany({
      where: { profileId, category: filter?.category, level: filter?.level },
      orderBy: { sortOrder: 'asc' },
    });
  }

  public async findExperienceByProfileId(
    profileId: string,
  ): Promise<ExperienceRow[]> {
    return this.prisma.experience.findMany({
      where: { profileId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  public async findProjectsByProfileId(
    profileId: string,
  ): Promise<ProjectRow[]> {
    return this.prisma.project.findMany({
      where: { profileId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  public async findAchievementsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<AchievementRow[]> {
    return this.prisma.achievement.findMany({
      where: { experienceId: { in: [...experienceIds] } },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
