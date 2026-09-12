import {
  Field,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export enum ProfileLinkKind {
  GITHUB = 'GITHUB',
  LINKEDIN = 'LINKEDIN',
  WEBSITE = 'WEBSITE',
  TELEGRAM = 'TELEGRAM',
  BLOG = 'BLOG',
  EMAIL = 'EMAIL',
}

export enum SkillLevel {
  EXPERT = 'EXPERT',
  STRONG = 'STRONG',
  FAMILIAR = 'FAMILIAR',
  BASIC = 'BASIC',
}

export enum ProjectStatus {
  LIVE = 'LIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  ARCHIVED = 'ARCHIVED',
}

registerEnumType(ProfileLinkKind, { name: 'ProfileLinkKind' });
registerEnumType(SkillLevel, { name: 'SkillLevel' });
registerEnumType(ProjectStatus, { name: 'ProjectStatus' });

@ObjectType()
export class Achievement {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => String)
  readonly text!: string;
}

@ObjectType()
export class Experience {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => String)
  readonly company!: string;

  @Field(() => String)
  readonly position!: string;

  @Field(() => String, { nullable: true })
  readonly companyUrl!: string | null;

  @Field(() => String, { nullable: true })
  readonly location!: string | null;

  @Field(() => Date)
  readonly startedAt!: Date;

  @Field(() => Date, { nullable: true })
  readonly finishedAt!: Date | null;

  @Field(() => String, { nullable: true })
  readonly summary!: string | null;

  @Field(() => [Achievement])
  readonly achievements!: Achievement[];

  @Field(() => String)
  readonly period!: string;

  @Field(() => Boolean)
  readonly isCurrent!: boolean;
}

@ObjectType()
export class ProfileLink {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => ProfileLinkKind)
  readonly kind!: ProfileLinkKind;

  @Field(() => String)
  readonly label!: string;

  @Field(() => String)
  readonly url!: string;
}

@ObjectType()
export class Skill {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => String)
  readonly name!: string;

  @Field(() => String)
  readonly category!: string;

  @Field(() => SkillLevel)
  readonly level!: SkillLevel;
}

@ObjectType()
export class Project {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => String)
  readonly name!: string;

  @Field(() => String)
  readonly slug!: string;

  @Field(() => String, { nullable: true })
  readonly description!: string | null;

  @Field(() => String, { nullable: true })
  readonly url!: string | null;

  @Field(() => String, { nullable: true })
  readonly repositoryUrl!: string | null;

  @Field(() => ProjectStatus)
  readonly status!: ProjectStatus;

  @Field(() => [String])
  readonly stack!: string[];
}

@ObjectType()
export class Profile {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => String)
  readonly slug!: string;

  @Field(() => String)
  readonly name!: string;

  @Field(() => String)
  readonly headline!: string;

  @Field(() => String)
  readonly description!: string;

  @Field(() => String, { nullable: true })
  readonly location!: string | null;

  @Field(() => String, { nullable: true })
  readonly timezone!: string | null;

  @Field(() => Boolean)
  readonly available!: boolean;

  @Field(() => Date)
  readonly updatedAt!: Date;

  @Field(() => [ProfileLink])
  readonly links!: ProfileLink[];

  @Field(() => [Skill])
  readonly skills!: Skill[];

  @Field(() => [Experience])
  readonly experience!: Experience[];

  @Field(() => [Project])
  readonly projects!: Project[];
}

@InputType()
export class SkillFilterInput {
  @Field(() => String, { nullable: true })
  readonly category?: string;

  @Field(() => SkillLevel, { nullable: true })
  readonly level?: SkillLevel;
}
