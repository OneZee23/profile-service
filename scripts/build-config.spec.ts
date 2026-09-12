import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const script = path.join(__dirname, 'build-config.mjs');

const CONFIG_YAML = [
  'DatabaseConfig:',
  '  host: from-config',
  '  port: 5432',
  '  username: postgres',
  '  password: from-config',
  '  database: postgres',
  '  schema: public',
  '  poolSize: 3',
  'GraphqlConfig:',
  '  maxDepth: 8',
  '',
].join('\n');

const RESUME_YAML = [
  'DatabaseConfig:',
  '  host: from-resume',
  'ResumeConfig:',
  '  profile:',
  '    slug: sample',
  '  skills:',
  '    - name: NestJS',
  '',
].join('\n');

function buildFixture(configYaml: string = CONFIG_YAML): string {
  const root = mkdtempSync(path.join(tmpdir(), 'profile-service-build-'));
  mkdirSync(path.join(root, 'config'));
  writeFileSync(path.join(root, 'config', 'config.example.yaml'), configYaml);
  writeFileSync(path.join(root, 'config', 'resume.example.yaml'), RESUME_YAML);
  return root;
}

function run(root: string, args: string[], secrets?: string): string {
  return execFileSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: secrets
      ? { ...process.env, CONFIG_SECRETS_JSON: secrets }
      : { ...process.env, CONFIG_SECRETS_JSON: '' },
  });
}

function runFailure(root: string, args: string[]): string {
  try {
    run(root, args);
  } catch (thrown) {
    return String((thrown as { stderr: string }).stderr);
  }

  throw new Error('Expected build-config.mjs to fail');
}

function readRendered(root: string): Record<string, Record<string, unknown>> {
  const rendered = readFileSync(path.join(root, 'config.json'), 'utf-8');
  return JSON.parse(rendered) as Record<string, Record<string, unknown>>;
}

describe('build-config.mjs', () => {
  it('merges resume over config and keeps untouched keys', () => {
    const root = buildFixture();

    run(root, ['--env=local']);

    const rendered = readRendered(root);
    expect(rendered.DatabaseConfig.host).toBe('from-resume');
    expect(rendered.DatabaseConfig.port).toBe(5432);
    expect(rendered.GraphqlConfig.maxDepth).toBe(8);
    expect(rendered.ResumeConfig.profile).toEqual({ slug: 'sample' });
  });

  it('merges CONFIG_SECRETS_JSON last', () => {
    const root = buildFixture();

    run(
      root,
      ['--env=local'],
      '{"DatabaseConfig":{"host":"from-secrets","password":"s3cret"}}',
    );

    const rendered = readRendered(root);
    expect(rendered.DatabaseConfig.host).toBe('from-secrets');
    expect(rendered.DatabaseConfig.password).toBe('s3cret');
    expect(rendered.DatabaseConfig.port).toBe(5432);
  });

  it('replaces arrays instead of concatenating them', () => {
    const root = buildFixture();

    run(root, ['--env=local'], '{"ResumeConfig":{"skills":[{"name":"Prisma"}]}}');

    const rendered = readRendered(root);
    expect(rendered.ResumeConfig.skills).toEqual([{ name: 'Prisma' }]);
  });

  it('honours --out', () => {
    const root = buildFixture();

    run(root, ['--env=local', '--out=rendered.json']);

    const rendered = readFileSync(path.join(root, 'rendered.json'), 'utf-8');
    expect(JSON.parse(rendered)).toHaveProperty('ResumeConfig');
  });

  it('prints the database url from the rendered config.json', () => {
    const root = buildFixture();
    run(root, ['--env=local']);

    const url = run(root, ['--print-database-url']).trim();

    expect(url).toBe(
      'postgresql://postgres:from-config@from-resume:5432/postgres' +
        '?schema=public&connection_limit=3',
    );
  });

  it('refuses to print a database url when the password is absent', () => {
    const root = buildFixture(
      CONFIG_YAML.replace('  password: from-config\n', ''),
    );
    run(root, ['--env=local']);

    expect(runFailure(root, ['--print-database-url'])).toContain(
      'DatabaseConfig.password is missing',
    );
  });

  it('writes the render banner to stderr, not stdout', () => {
    const root = buildFixture();

    expect(run(root, ['--env=local'])).toBe('');
  });

  it('rejects an unknown environment', () => {
    const root = buildFixture();

    expect(runFailure(root, ['--env=staging'])).toContain(
      'Unknown environment "staging"',
    );
  });
});
