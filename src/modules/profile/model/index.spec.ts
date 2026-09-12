import { NestFactory } from '@nestjs/core';
import {
  Args,
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { lexicographicSortSchema, printSchema } from 'graphql';
import {
  Achievement,
  Experience,
  Profile,
  ProfileLink,
  Project,
  Skill,
  SkillFilterInput,
} from './index';

/* eslint-disable @typescript-eslint/no-unused-vars */

@Resolver(() => Profile)
class ProfileSchemaProbeResolver {
  @Query(() => Profile, { name: 'profile' })
  profile(@Args('slug', { nullable: true }) slug?: string): Profile {
    return null as unknown as Profile;
  }

  @ResolveField(() => [ProfileLink])
  links(@Parent() profile: Profile): ProfileLink[] {
    return [];
  }

  @ResolveField(() => [Skill])
  skills(
    @Parent() profile: Profile,
    @Args('filter', { nullable: true }) filter?: SkillFilterInput,
  ): Skill[] {
    return [];
  }

  @ResolveField(() => [Experience])
  experience(@Parent() profile: Profile): Experience[] {
    return [];
  }

  @ResolveField(() => [Project])
  projects(@Parent() profile: Profile): Project[] {
    return [];
  }
}

@Resolver(() => Experience)
class ExperienceSchemaProbeResolver {
  @ResolveField(() => [Achievement])
  achievements(@Parent() experience: Experience): Achievement[] {
    return [];
  }

  @ResolveField(() => String)
  period(@Parent() experience: Experience): string {
    return '';
  }

  @ResolveField(() => Boolean)
  isCurrent(@Parent() experience: Experience): boolean {
    return false;
  }
}

const EXPECTED_SDL = `type Achievement {
  id: ID!
  text: String!
}

"""
A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format.
"""
scalar DateTime

type Experience {
  achievements: [Achievement!]!
  company: String!
  companyUrl: String
  finishedAt: DateTime
  id: ID!
  isCurrent: Boolean!
  location: String
  period: String!
  position: String!
  startedAt: DateTime!
  summary: String
}

type Profile {
  available: Boolean!
  description: String!
  experience: [Experience!]!
  headline: String!
  id: ID!
  links: [ProfileLink!]!
  location: String
  name: String!
  projects: [Project!]!
  skills(filter: SkillFilterInput): [Skill!]!
  slug: String!
  timezone: String
  updatedAt: DateTime!
}

type ProfileLink {
  id: ID!
  kind: ProfileLinkKind!
  label: String!
  url: String!
}

enum ProfileLinkKind {
  BLOG
  EMAIL
  GITHUB
  LINKEDIN
  TELEGRAM
  WEBSITE
}

type Project {
  description: String
  id: ID!
  name: String!
  repositoryUrl: String
  slug: String!
  stack: [String!]!
  status: ProjectStatus!
  url: String
}

enum ProjectStatus {
  ARCHIVED
  IN_PROGRESS
  LIVE
}

type Query {
  profile(slug: String): Profile!
}

type Skill {
  category: String!
  id: ID!
  level: SkillLevel!
  name: String!
}

input SkillFilterInput {
  category: String
  level: SkillLevel
}

enum SkillLevel {
  BASIC
  EXPERT
  FAMILIAR
  STRONG
}`;

describe('profile model', () => {
  it('should generate the committed SDL', async () => {
    const app = await NestFactory.create(GraphQLSchemaBuilderModule, {
      logger: false,
    });
    await app.init();

    const schema = await app
      .get(GraphQLSchemaFactory)
      .create([ProfileSchemaProbeResolver, ExperienceSchemaProbeResolver]);
    const sdl = printSchema(lexicographicSortSchema(schema));

    await app.close();

    expect(sdl).toBe(EXPECTED_SDL);
  });
});
