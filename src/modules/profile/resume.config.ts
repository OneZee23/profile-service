import { Injectable } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsResumeDate } from '@/utils/resume-date';
import { ProfileLinkKind, ProjectStatus, SkillLevel } from './model';

export class ResumeProfileEntry {
  @IsString()
  @IsNotEmpty()
  readonly slug: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly headline: string;

  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsString()
  @IsOptional()
  readonly location?: string;

  @IsString()
  @IsOptional()
  readonly timezone?: string;

  @IsBoolean()
  readonly available: boolean = true;
}

export class ResumeLinkEntry {
  @IsEnum(ProfileLinkKind)
  readonly kind: ProfileLinkKind;

  @IsString()
  @IsNotEmpty()
  readonly label: string;

  @IsString()
  @IsNotEmpty()
  readonly url: string;
}

export class ResumeSkillEntry {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly category: string;

  @IsEnum(SkillLevel)
  readonly level: SkillLevel;
}

export class ResumeExperienceEntry {
  @IsString()
  @IsNotEmpty()
  readonly company: string;

  @IsString()
  @IsNotEmpty()
  readonly position: string;

  @IsString()
  @IsOptional()
  readonly companyUrl?: string;

  @IsString()
  @IsOptional()
  readonly location?: string;

  @IsResumeDate()
  readonly startedAt: string;

  @IsResumeDate()
  @IsOptional()
  readonly finishedAt?: string;

  @IsString()
  @IsOptional()
  readonly summary?: string;

  @IsString({ each: true })
  @IsArray()
  readonly achievements: string[] = [];
}

export class ResumeProjectEntry {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly slug: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsString()
  @IsOptional()
  readonly url?: string;

  @IsString()
  @IsOptional()
  readonly repositoryUrl?: string;

  @IsEnum(ProjectStatus)
  readonly status: ProjectStatus;

  @IsString({ each: true })
  @IsArray()
  readonly stack: string[] = [];
}

@Injectable()
export class ResumeConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => ResumeProfileEntry)
  readonly profile: ResumeProfileEntry;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeLinkEntry)
  readonly links: ResumeLinkEntry[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillEntry)
  readonly skills: ResumeSkillEntry[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceEntry)
  readonly experience: ResumeExperienceEntry[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeProjectEntry)
  readonly projects: ResumeProjectEntry[] = [];
}
