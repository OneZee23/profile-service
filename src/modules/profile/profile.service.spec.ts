import {
  Experience as ExperienceRow,
  Profile as ProfileRow,
} from '@prisma/client';
import { ProfileNotFoundError } from './errors';
import { AchievementsLoader } from './loaders/achievements.loader';
import { ProfileService } from './profile.service';
import { ResumeConfig } from './resume.config';
import { ProfileStateService } from './services/profile-state.service';

const profileRow = (slug: string): ProfileRow => ({
  id: slug,
  slug,
  name: 'Nikita Shevelev',
  headline: 'Backend engineer',
  description: 'Builds NestJS services',
  location: null,
  timezone: null,
  available: true,
  createdAt: new Date('2026-09-10T00:00:00.000Z'),
  updatedAt: new Date('2026-09-10T00:00:00.000Z'),
});

const experienceRow = (finishedAt: Date | null): ExperienceRow => ({
  id: 'onezee:exp:ime-backend-engineer',
  profileId: 'onezee',
  company: 'iMe',
  position: 'Backend engineer',
  companyUrl: null,
  location: null,
  startedAt: new Date('2021-04-01T00:00:00.000Z'),
  finishedAt,
  summary: null,
  sortOrder: 0,
});

class FakeProfileStateService {
  public readonly requestedSlugs: string[] = [];

  constructor(private readonly profiles: ProfileRow[]) {}

  public async findProfileBySlug(slug: string): Promise<ProfileRow | null> {
    this.requestedSlugs.push(slug);

    return this.profiles.find((profile) => profile.slug === slug) ?? null;
  }
}

const build = (
  profiles: ProfileRow[],
): { state: FakeProfileStateService; service: ProfileService } => {
  const state = new FakeProfileStateService(profiles);
  const config = { profile: { slug: 'onezee' } } as unknown as ResumeConfig;
  const service = new ProfileService(
    config,
    state as unknown as ProfileStateService,
    undefined as unknown as AchievementsLoader,
  );

  return { state, service };
};

describe('ProfileService.getProfile', () => {
  it('throws ProfileNotFoundError carrying the slug when nothing matches', async () => {
    const { service } = build([]);

    const thrown = await service
      .getProfile('ghost')
      .catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ProfileNotFoundError);

    const error = thrown as ProfileNotFoundError;
    expect(error.code).toBe('ERR_PROFILE_NOT_FOUND');
    expect(error.message).toBe('Profile "ghost" not found');
    expect(error.payload()).toEqual({ slug: 'ghost' });
  });

  it('falls back to the configured slug when none is given', async () => {
    const { service, state } = build([profileRow('onezee')]);

    const profile = await service.getProfile();

    expect(profile.slug).toBe('onezee');
    expect(state.requestedSlugs).toEqual(['onezee']);
  });

  it('looks up the requested slug when one is given', async () => {
    const { service, state } = build([profileRow('someone-else')]);

    const profile = await service.getProfile('someone-else');

    expect(profile.id).toBe('someone-else');
    expect(state.requestedSlugs).toEqual(['someone-else']);
  });
});

describe('ProfileService period derivation', () => {
  it('renders an open-ended experience as present and marks it current', () => {
    const { service } = build([]);
    const experience = experienceRow(null);

    expect(service.getPeriod(experience)).toBe('2021 — present');
    expect(service.isCurrent(experience)).toBe(true);
  });

  it('renders a closed experience as a year range and does not mark it current', () => {
    const { service } = build([]);
    const experience = experienceRow(new Date('2026-03-01T00:00:00.000Z'));

    expect(service.getPeriod(experience)).toBe('2021 — 2026');
    expect(service.isCurrent(experience)).toBe(false);
  });
});
