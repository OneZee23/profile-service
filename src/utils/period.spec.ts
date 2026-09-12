import { formatPeriod, isCurrentPeriod } from './period';

const started = new Date('2021-05-01T00:00:00Z');
const finished = new Date('2026-01-31T00:00:00Z');

describe('formatPeriod', () => {
  it('renders an open range as the start year and present', () => {
    expect(formatPeriod(started, null)).toBe('2021 — present');
  });

  it('renders a closed range as both years', () => {
    expect(formatPeriod(started, finished)).toBe('2021 — 2026');
  });

  it('reads the year in UTC so a @db.Date midnight never slips a year', () => {
    expect(
      formatPeriod(
        new Date('2021-01-01T00:00:00Z'),
        new Date('2025-12-31T00:00:00Z'),
      ),
    ).toBe('2021 — 2025');
  });

  it('separates with an em dash, never a hyphen', () => {
    expect(formatPeriod(started, finished)).toContain('—');
    expect(formatPeriod(started, finished)).not.toContain('-');
  });
});

describe('isCurrentPeriod', () => {
  it('is true only while there is no finish date', () => {
    expect(isCurrentPeriod(null)).toBe(true);
    expect(isCurrentPeriod(finished)).toBe(false);
  });
});
