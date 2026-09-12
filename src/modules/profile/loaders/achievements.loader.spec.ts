import { Achievement as AchievementRow } from '@prisma/client';
import { ProfileStateService } from '../services/profile-state.service';
import { AchievementsLoader } from './achievements.loader';

const achievementRow = (
  name: string,
  experienceId: string,
  sortOrder: number,
): AchievementRow => ({
  id: `${experienceId}:ach:${name}`,
  experienceId,
  text: `Achievement ${name}`,
  sortOrder,
});

class FakeProfileStateService {
  public readonly batches: string[][] = [];

  constructor(private readonly rows: AchievementRow[]) {}

  public async findAchievementsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<AchievementRow[]> {
    this.batches.push([...experienceIds]);
    return this.rows.filter((row) => experienceIds.includes(row.experienceId));
  }
}

const build = (
  rows: AchievementRow[],
): { state: FakeProfileStateService; loader: AchievementsLoader } => {
  const state = new FakeProfileStateService(rows);
  const loader = new AchievementsLoader(
    state as unknown as ProfileStateService,
  );

  return { state, loader };
};

describe('AchievementsLoader', () => {
  it('groups achievements by experience id, preserving the requested key order', async () => {
    const { loader } = build([
      achievementRow('b1', 'exp-b', 0),
      achievementRow('a1', 'exp-a', 0),
      achievementRow('a2', 'exp-a', 1),
    ]);

    const grouped = (await loader.byExperienceId.loadMany([
      'exp-a',
      'exp-b',
    ])) as AchievementRow[][];

    expect(grouped.map((rows) => rows.map((row) => row.id))).toEqual([
      ['exp-a:ach:a1', 'exp-a:ach:a2'],
      ['exp-b:ach:b1'],
    ]);
  });

  it('returns an empty array for an experience with no achievements', async () => {
    const { loader } = build([achievementRow('a1', 'exp-a', 0)]);

    const grouped = (await loader.byExperienceId.loadMany([
      'exp-missing',
      'exp-a',
    ])) as AchievementRow[][];

    expect(grouped[0]).toEqual([]);
    expect(grouped[1].map((row) => row.id)).toEqual(['exp-a:ach:a1']);
  });

  it('collapses every key loaded in the same tick into one state service call', async () => {
    const { loader, state } = build([
      achievementRow('a1', 'exp-a', 0),
      achievementRow('b1', 'exp-b', 0),
    ]);

    await Promise.all([
      loader.byExperienceId.load('exp-a'),
      loader.byExperienceId.load('exp-b'),
      loader.byExperienceId.load('exp-c'),
    ]);

    expect(state.batches).toEqual([['exp-a', 'exp-b', 'exp-c']]);
  });

  it('serves a repeated key from its own cache without a second state service call', async () => {
    const { loader, state } = build([achievementRow('a1', 'exp-a', 0)]);

    await loader.byExperienceId.load('exp-a');
    await loader.byExperienceId.load('exp-a');

    expect(state.batches).toEqual([['exp-a']]);
  });

  it('keeps the state service row order inside a group', async () => {
    const { loader } = build([
      achievementRow('a2', 'exp-a', 1),
      achievementRow('b1', 'exp-b', 0),
      achievementRow('a1', 'exp-a', 0),
    ]);

    const rows = await loader.byExperienceId.load('exp-a');

    expect(rows.map((row) => row.sortOrder)).toEqual([1, 0]);
  });
});
