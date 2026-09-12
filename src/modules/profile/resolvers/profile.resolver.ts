import { UseFilters } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  Experience as ExperienceRow,
  ProfileLink as ProfileLinkRow,
  Profile as ProfileRow,
  Project as ProjectRow,
  Skill as SkillRow,
} from '@prisma/client';
import { GqlAppErrorFilter } from '@/infra/graphql/gql-app-error.filter';
import {
  Experience,
  Profile,
  ProfileLink,
  Project,
  Skill,
  SkillFilterInput,
} from '../model';
import { ProfileService } from '../profile.service';

@Resolver(() => Profile)
@UseFilters(GqlAppErrorFilter)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => Profile, { name: 'profile' })
  public async profile(
    @Args('slug', { nullable: true }) slug?: string,
  ): Promise<ProfileRow> {
    return this.profileService.getProfile(slug);
  }

  @ResolveField(() => [ProfileLink])
  public async links(@Parent() profile: ProfileRow): Promise<ProfileLinkRow[]> {
    return this.profileService.getLinks(profile.id);
  }

  @ResolveField(() => [Skill])
  public async skills(
    @Parent() profile: ProfileRow,
    @Args('filter', { nullable: true }) filter?: SkillFilterInput,
  ): Promise<SkillRow[]> {
    return this.profileService.getSkills(profile.id, filter);
  }

  @ResolveField(() => [Experience])
  public async experience(
    @Parent() profile: ProfileRow,
  ): Promise<ExperienceRow[]> {
    return this.profileService.getExperience(profile.id);
  }

  @ResolveField(() => [Project])
  public async projects(@Parent() profile: ProfileRow): Promise<ProjectRow[]> {
    return this.profileService.getProjects(profile.id);
  }
}
