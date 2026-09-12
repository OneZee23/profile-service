import { Module } from '@nestjs/common';
import { provideConfig } from '@/utils/config';
import { AchievementsLoader } from './loaders/achievements.loader';
import { ProfileService } from './profile.service';
import { ExperienceResolver } from './resolvers/experience.resolver';
import { ProfileResolver } from './resolvers/profile.resolver';
import { ResumeConfig } from './resume.config';
import { ProfileSeedService } from './services/profile-seed.service';
import { ProfileStateService } from './services/profile-state.service';

@Module({
  providers: [
    provideConfig(ResumeConfig),
    ProfileStateService,
    ProfileSeedService,
    AchievementsLoader,
    ProfileService,
    ProfileResolver,
    ExperienceResolver,
  ],
  exports: [ProfileService, ProfileStateService, ProfileSeedService],
})
export class ProfileModule {}
