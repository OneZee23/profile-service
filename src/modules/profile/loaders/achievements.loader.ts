import { Injectable, Scope } from '@nestjs/common';
import { Achievement as AchievementRow } from '@prisma/client';
import DataLoader from 'dataloader';
import { ProfileStateService } from '../services/profile-state.service';

@Injectable({ scope: Scope.REQUEST })
export class AchievementsLoader {
  public readonly byExperienceId: DataLoader<string, AchievementRow[]>;

  constructor(private readonly state: ProfileStateService) {
    this.byExperienceId = new DataLoader<string, AchievementRow[]>(
      (experienceIds) => this.loadByExperienceIds(experienceIds),
    );
  }

  private async loadByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<AchievementRow[][]> {
    const rows =
      await this.state.findAchievementsByExperienceIds(experienceIds);
    const grouped = this.groupByExperienceId(rows);

    return experienceIds.map((experienceId) => grouped.get(experienceId) ?? []);
  }

  private groupByExperienceId(
    rows: AchievementRow[],
  ): Map<string, AchievementRow[]> {
    const grouped = new Map<string, AchievementRow[]>();

    for (const row of rows) {
      const group = grouped.get(row.experienceId);

      if (group) {
        group.push(row);
      } else {
        grouped.set(row.experienceId, [row]);
      }
    }

    return grouped;
  }
}
