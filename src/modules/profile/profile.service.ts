import { Injectable } from '@nestjs/common';
import {
  Achievement as AchievementRow,
  Experience as ExperienceRow,
  ProfileLink as ProfileLinkRow,
  Profile as ProfileRow,
  Project as ProjectRow,
  Skill as SkillRow,
} from '@prisma/client';
import { formatPeriod, isCurrentPeriod } from '@/utils/period';
import { ProfileNotFoundError } from './errors';
import { AchievementsLoader } from './loaders/achievements.loader';
import { SkillFilterInput } from './model';
import { ResumeConfig } from './resume.config';
import { ProfileStateService } from './services/profile-state.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly config: ResumeConfig,
    private readonly state: ProfileStateService,
    private readonly achievementsLoader: AchievementsLoader,
  ) {}

  public async getProfile(slug?: string): Promise<ProfileRow> {
    const wanted = slug ?? this.config.profile.slug;
    const profile = await this.state.findProfileBySlug(wanted);

    if (!profile) {
      throw new ProfileNotFoundError(wanted);
    }

    return profile;
  }

  public async getLinks(profileId: string): Promise<ProfileLinkRow[]> {
    return this.state.findLinksByProfileId(profileId);
  }

  public async getSkills(
    profileId: string,
    filter?: SkillFilterInput,
  ): Promise<SkillRow[]> {
    return this.state.findSkillsByProfileId(profileId, filter);
  }

  public async getExperience(profileId: string): Promise<ExperienceRow[]> {
    return this.state.findExperienceByProfileId(profileId);
  }

  public async getProjects(profileId: string): Promise<ProjectRow[]> {
    return this.state.findProjectsByProfileId(profileId);
  }

  public async getAchievements(
    experienceId: string,
  ): Promise<AchievementRow[]> {
    return this.achievementsLoader.byExperienceId.load(experienceId);
  }

  public getPeriod(experience: ExperienceRow): string {
    return formatPeriod(experience.startedAt, experience.finishedAt);
  }

  public isCurrent(experience: ExperienceRow): boolean {
    return isCurrentPeriod(experience.finishedAt);
  }
}
