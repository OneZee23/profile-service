import { validateSync } from 'class-validator';
import { IsResumeDate, parseResumeDate } from './resume-date';

class Entry {
  @IsResumeDate()
  readonly startedAt: string;

  constructor(startedAt: string) {
    this.startedAt = startedAt;
  }
}

function propertiesFailing(value: string): string[] {
  return validateSync(new Entry(value)).map((error) => error.property);
}

describe('parseResumeDate', () => {
  it('accepts a year and month', () => {
    expect(parseResumeDate('2021-03')?.toISOString()).toBe(
      '2021-03-01T00:00:00.000Z',
    );
  });

  it('accepts a full calendar date', () => {
    expect(parseResumeDate('2026-06-30')?.toISOString()).toBe(
      '2026-06-30T00:00:00.000Z',
    );
  });

  it('rejects a day the month does not have', () => {
    expect(parseResumeDate('2023-02-30')).toBeUndefined();
  });

  it('rejects a month outside the year', () => {
    expect(parseResumeDate('2023-13')).toBeUndefined();
  });

  it('rejects anything that is not the documented shape', () => {
    expect(parseResumeDate('March 2021')).toBeUndefined();
    expect(parseResumeDate('2021')).toBeUndefined();
    expect(parseResumeDate('2021-3')).toBeUndefined();
  });
});

describe('IsResumeDate', () => {
  it('passes a real date', () => {
    expect(propertiesFailing('2021-03')).toEqual([]);
  });

  it('names the property when the date is not a real one', () => {
    expect(propertiesFailing('2023-02-30')).toEqual(['startedAt']);
  });
});
