import { getLogLevels, isProduction } from './env';

describe('env', () => {
  const environment = { ...process.env };

  afterEach(() => {
    process.env = { ...environment };
  });

  it('recognises production', () => {
    process.env.NODE_ENV = 'production';

    expect(isProduction()).toBe(true);
  });

  it('treats anything else as not production', () => {
    process.env.NODE_ENV = 'test';
    expect(isProduction()).toBe(false);

    delete process.env.NODE_ENV;
    expect(isProduction()).toBe(false);
  });

  it('defaults the log levels when LOG_LEVEL is unset', () => {
    delete process.env.LOG_LEVEL;

    expect(getLogLevels()).toEqual(['log', 'warn', 'error']);
  });

  it('parses a comma separated LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'error, warn ,verbose';

    expect(getLogLevels()).toEqual(['error', 'warn', 'verbose']);
  });
});
