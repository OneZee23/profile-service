import { IsInt, IsString, Max } from 'class-validator';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

class SampleConfig {
  @IsString()
  readonly title = 'default title';

  @IsInt()
  @Max(10)
  readonly size = 1;
}

type ConfigModule = typeof import('./config');

interface LoadedConfigModule {
  getConfig: ConfigModule['getConfig'];
  provideConfig: ConfigModule['provideConfig'];
  warn: jest.SpyInstance;
}

const workspace = mkdtempSync(path.join(tmpdir(), 'profile-service-config-'));

let sequence = 0;

function writeConfigFile(contents: object): string {
  sequence += 1;
  const filename = path.join(workspace, `config-${sequence}.json`);
  writeFileSync(filename, JSON.stringify(contents));
  return filename;
}

function loadConfigModule(): LoadedConfigModule {
  jest.resetModules();
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const nest = require('@nestjs/common') as typeof import('@nestjs/common');
  jest.spyOn(nest.Logger.prototype, 'log').mockImplementation();
  const warn = jest.spyOn(nest.Logger.prototype, 'warn').mockImplementation();
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const loader = require('./config') as ConfigModule;

  return {
    getConfig: loader.getConfig,
    provideConfig: loader.provideConfig,
    warn,
  };
}

describe('getConfig', () => {
  const environment = { ...process.env };

  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  it('resolves the section named after the config class', async () => {
    process.env.CONFIG_JSON_PATH = writeConfigFile({
      SampleConfig: { title: 'from file', size: 7 },
      OtherConfig: { title: 'ignored' },
    });

    const config = await loadConfigModule().getConfig(SampleConfig);

    expect(config.title).toBe('from file');
    expect(config.size).toBe(7);
  });

  it('falls back to declared defaults when the section is missing', async () => {
    process.env.CONFIG_JSON_PATH = writeConfigFile({ OtherConfig: {} });

    const config = await loadConfigModule().getConfig(SampleConfig);

    expect(config.title).toBe('default title');
    expect(config.size).toBe(1);
  });

  it('names the offending properties when validation fails', async () => {
    process.env.CONFIG_JSON_PATH = writeConfigFile({
      SampleConfig: { title: 42, size: 99 },
    });

    await expect(loadConfigModule().getConfig(SampleConfig)).rejects.toThrow(
      'Bad SampleConfig: failed validation on title, size',
    );
  });

  it('throws when the configuration file is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CONFIG_JSON_PATH = path.join(workspace, 'absent.json');

    await expect(loadConfigModule().getConfig(SampleConfig)).rejects.toThrow(
      'Failed to load configuration',
    );
  });

  it('warns and uses defaults when the file is missing outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CONFIG_JSON_PATH = path.join(workspace, 'absent.json');
    const loaded = loadConfigModule();

    const config = await loaded.getConfig(SampleConfig);

    expect(config.title).toBe('default title');
    expect(loaded.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load configuration'),
    );
  });
});

describe('provideConfig', () => {
  const environment = { ...process.env };

  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  it('builds a nest provider keyed by the config class', async () => {
    process.env.CONFIG_JSON_PATH = writeConfigFile({
      SampleConfig: { title: 'provided', size: 3 },
    });

    const provider = loadConfigModule().provideConfig(SampleConfig) as {
      provide: unknown;
      useFactory: () => Promise<SampleConfig>;
    };

    expect(provider.provide).toBe(SampleConfig);
    await expect(provider.useFactory()).resolves.toMatchObject({
      title: 'provided',
      size: 3,
    });
  });
});
