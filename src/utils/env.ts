import { LogLevel } from '@nestjs/common';

const DEFAULT_LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error'];

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getLogLevels(): LogLevel[] {
  const configured = process.env.LOG_LEVEL;
  if (!configured) {
    return DEFAULT_LOG_LEVELS;
  }

  return configured.split(',').map((level) => level.trim() as LogLevel);
}
