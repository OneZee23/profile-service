import { UseFilters } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  Achievement as AchievementRow,
  Experience as ExperienceRow,
} from '@prisma/client';
import { GqlAppErrorFilter } from '@/infra/graphql/gql-app-error.filter';
import { Achievement, Experience } from '../model';
import { ProfileService } from '../profile.service';

@Resolver(() => Experience)
@UseFilters(GqlAppErrorFilter)
export class ExperienceResolver {
  constructor(private readonly profileService: ProfileService) {}

  @ResolveField(() => [Achievement])
  public async achievements(
    @Parent() experience: ExperienceRow,
  ): Promise<AchievementRow[]> {
    return this.profileService.getAchievements(experience.id);
  }

  @ResolveField(() => String)
  public period(@Parent() experience: ExperienceRow): string {
    return this.profileService.getPeriod(experience);
  }

  @ResolveField(() => Boolean)
  public isCurrent(@Parent() experience: ExperienceRow): boolean {
    return this.profileService.isCurrent(experience);
  }
}
