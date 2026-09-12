#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parse } from 'yaml';

const ENVIRONMENT_SOURCES = { local: 'example', prod: 'prod' };

const DATABASE_DEFAULTS = {
  host: '127.0.0.1',
  port: 5432,
  username: 'postgres',
  database: 'postgres',
  schema: 'public',
  poolSize: 3,
};

function parseArguments(argv) {
  const options = { env: 'local', out: 'config.json', printDatabaseUrl: false };

  for (const argument of argv) {
    if (argument === '--print-database-url') {
      options.printDatabaseUrl = true;
    } else if (argument.startsWith('--env=')) {
      options.env = argument.slice('--env='.length);
    } else if (argument.startsWith('--out=')) {
      options.out = argument.slice('--out='.length);
    } else {
      throw new Error(`Unknown argument ${argument}`);
    }
  }

  return options;
}

function isMergeable(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(base, overlay) {
  const merged = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    merged[key] =
      isMergeable(value) && isMergeable(merged[key])
        ? deepMerge(merged[key], value)
        : value;
  }

  return merged;
}

function readConfigYaml(filename) {
  const parsed = parse(readFileSync(filename, 'utf-8'));
  if (!isMergeable(parsed)) {
    throw new Error(`${filename} does not contain a YAML mapping`);
  }

  return parsed;
}

function composeDatabaseUrl(section) {
  const database = { ...DATABASE_DEFAULTS, ...section };

  for (const name of [...Object.keys(DATABASE_DEFAULTS), 'password']) {
    const value = database[name];
    if (value === undefined || value === '') {
      throw new Error(`DatabaseConfig.${name} is missing`);
    }
  }

  const credentials = [
    encodeURIComponent(database.username),
    encodeURIComponent(database.password),
  ].join(':');
  const options = `schema=${database.schema}&connection_limit=${database.poolSize}`;

  return `postgresql://${credentials}@${database.host}:${database.port}/${database.database}?${options}`;
}

function printDatabaseUrl() {
  const filename = process.env.CONFIG_JSON_PATH || 'config.json';
  const full = JSON.parse(readFileSync(filename, 'utf-8'));
  const section = isMergeable(full.DatabaseConfig) ? full.DatabaseConfig : {};

  process.stdout.write(`${composeDatabaseUrl(section)}\n`);
}

function renderConfig(options) {
  const source = ENVIRONMENT_SOURCES[options.env];
  if (source === undefined) {
    throw new Error(`Unknown environment "${options.env}". Use local or prod`);
  }

  const configDirectory = path.join(process.cwd(), 'config');
  const layers = [
    readConfigYaml(path.join(configDirectory, `config.${source}.yaml`)),
    readConfigYaml(path.join(configDirectory, `resume.${source}.yaml`)),
  ];
  if (process.env.CONFIG_SECRETS_JSON) {
    layers.push(JSON.parse(process.env.CONFIG_SECRETS_JSON));
  }

  const fullConfig = layers.reduce(deepMerge);
  const target = path.resolve(process.cwd(), options.out);
  writeFileSync(target, `${JSON.stringify(fullConfig, null, 2)}\n`);

  process.stderr.write(`Wrote ${target} from config/*.${source}.yaml\n`);
}

const options = parseArguments(process.argv.slice(2));

if (options.printDatabaseUrl) {
  printDatabaseUrl();
} else {
  renderConfig(options);
}
