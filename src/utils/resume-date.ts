import { ValidationOptions, registerDecorator } from 'class-validator';

const RESUME_DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

export function parseResumeDate(value: string): Date | undefined {
  const parts = RESUME_DATE.exec(value);
  if (!parts) return undefined;

  const [, year, month, day = '01'] = parts;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;

  const roundTripped = parsed.toISOString().slice(0, 10);

  return roundTripped === `${year}-${month}-${day}` ? parsed : undefined;
}

export function IsResumeDate(options?: ValidationOptions) {
  return function decorate(target: object, propertyName: string): void {
    registerDecorator({
      name: 'isResumeDate',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' && parseResumeDate(value) !== undefined
          );
        },
        defaultMessage(): string {
          return `${propertyName} must be a real calendar date as YYYY-MM or YYYY-MM-DD`;
        },
      },
    });
  };
}
