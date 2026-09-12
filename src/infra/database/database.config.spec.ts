import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { DatabaseConfig } from './database.config';

function printDatabaseUrl(section: object): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'profile-service-db-'));
  const filename = path.join(directory, 'config.json');
  writeFileSync(filename, JSON.stringify({ DatabaseConfig: section }));

  const stdout = execFileSync(
    process.execPath,
    ['scripts/build-config.mjs', '--print-database-url'],
    { encoding: 'utf-8', env: { ...process.env, CONFIG_JSON_PATH: filename } },
  );

  return stdout.trim();
}

const defaults = { password: 'postgres' };

const overrides = {
  host: 'db.internal',
  port: 6432,
  username: 'profile',
  password: 'p@ss word',
  database: 'profile',
  schema: 'cv',
  poolSize: 7,
};

describe('DatabaseConfig', () => {
  it('renders the documented connection string from defaults', () => {
    expect(plainToInstance(DatabaseConfig, defaults).url()).toBe(
      'postgresql://postgres:postgres@127.0.0.1:5432/postgres' +
        '?schema=public&connection_limit=3',
    );
  });

  it('percent-encodes credentials and carries every override', () => {
    expect(plainToInstance(DatabaseConfig, overrides).url()).toBe(
      'postgresql://profile:p%40ss%20word@db.internal:6432/profile' +
        '?schema=cv&connection_limit=7',
    );
  });

  it('rejects an absent password so a forgotten secret fails at boot', () => {
    const config = plainToInstance(DatabaseConfig, {});

    expect(validateSync(config).map((error) => error.property)).toEqual([
      'password',
    ]);
  });

  it('accepts a fully specified section', () => {
    expect(validateSync(plainToInstance(DatabaseConfig, overrides))).toEqual(
      [],
    );
  });
});

describe('build-config.mjs --print-database-url', () => {
  it('agrees with DatabaseConfig defaults when only the password is set', () => {
    expect(printDatabaseUrl(defaults)).toBe(
      plainToInstance(DatabaseConfig, defaults).url(),
    );
  });

  it('agrees with DatabaseConfig when every key is overridden', () => {
    expect(printDatabaseUrl(overrides)).toBe(
      plainToInstance(DatabaseConfig, overrides).url(),
    );
  });
});
