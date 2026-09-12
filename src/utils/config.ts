import { Logger, Provider } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { readFile } from 'fs/promises';

const logger = new Logger('Config');

const lazyFullConfig = (async (): Promise<Record<string, object>> => {
  const filename = process.env.CONFIG_JSON_PATH || 'config.json';
  const bytes = await readFile(filename);
  const json = bytes.toString('utf-8');
  const fullConfig = JSON.parse(json) as Record<string, object>;
  logger.log(`Full configuration loaded from ${filename}`);
  return fullConfig;
})().catch((thrown): Record<string, object> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Failed to load configuration: ${thrown}`);
  }
  logger.warn(`Failed to load configuration: ${thrown}`);
  return {};
});

type ConfigClass<T extends object> = { new (): T };

export async function getConfig<T extends object>(
  constructor: ConfigClass<T>,
): Promise<T> {
  const fullConfig = await lazyFullConfig;
  const section =
    constructor.name in fullConfig ? fullConfig[constructor.name] : {};

  const config = plainToInstance(constructor, section);
  const errors = validateSync(config);
  if (errors.length > 0) {
    const props = errors.map((error) => error.property).join(', ');
    throw new Error(`Bad ${constructor.name}: failed validation on ${props}`);
  }

  return config;
}

export function provideConfig<T extends object>(
  constructor: ConfigClass<T>,
): Provider<T> {
  return { provide: constructor, useFactory: () => getConfig(constructor) };
}
