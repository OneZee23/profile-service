const EM_DASH = '—';

export function formatPeriod(startedAt: Date, finishedAt: Date | null): string {
  const startYear = startedAt.getUTCFullYear();

  if (finishedAt === null) {
    return `${startYear} ${EM_DASH} present`;
  }

  return `${startYear} ${EM_DASH} ${finishedAt.getUTCFullYear()}`;
}

export function isCurrentPeriod(finishedAt: Date | null): boolean {
  return finishedAt === null;
}
