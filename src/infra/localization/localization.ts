import { readFileSync } from 'fs';
import ISO6391 from 'iso-639-1';
import path from 'path';
import { parse } from 'yaml';

export type LocalizationTemplate = Record<string, string>;

type LocalizationConfig = {
  languages: {
    default: string;
    similar: Record<string, string>;
  };
  templates: Record<string, LocalizationTemplate>;
};

function assertLanguage(code: string): void {
  if (ISO6391.validate(code)) return;

  const source = 'https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes';
  throw new Error(`${code} is not a language code. Please refer to ${source}`);
}

function assertText(templateName: string, text: unknown): void {
  if (typeof text !== 'string') {
    throw new Error(`Template ${templateName} is invalid: not a string dict`);
  }
  if (text.length === 0) {
    throw new Error(`Template ${templateName} is invalid: empty string`);
  }
}

function validateLocalization(config: LocalizationConfig): void {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Localization file is empty or is not a YAML mapping');
  }

  const defaultLanguage = config.languages.default;
  assertLanguage(defaultLanguage);

  for (const language of Object.keys(config.languages.similar)) {
    assertLanguage(language);
    assertLanguage(config.languages.similar[language]);
  }

  for (const templateName of Object.keys(config.templates)) {
    const template = config.templates[templateName];

    if (!(defaultLanguage in template)) {
      throw new Error(
        `Missing default lang (${defaultLanguage}) for ${templateName}`,
      );
    }

    for (const language of Object.keys(template)) {
      assertLanguage(language);
      assertText(templateName, template[language]);
    }
  }
}

function loadLocalization(): LocalizationConfig {
  const defaultPath = path.join(process.cwd(), 'assets', 'localization.yaml');
  const filename = process.env.LOCALIZATION_YAML_PATH || defaultPath;
  const yaml = readFileSync(filename).toString('utf-8');
  const config = parse(yaml) as LocalizationConfig;

  validateLocalization(config);

  return config;
}

const localization = loadLocalization();

function ownValue<T>(source: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(source, key)
    ? source[key]
    : undefined;
}

export function getTemplate(
  templateName: string,
): LocalizationTemplate | undefined {
  return ownValue(localization.templates, templateName);
}

export function getTemplateNames(): string[] {
  return Object.keys(localization.templates);
}

export function getDefaultLanguage(): string {
  return localization.languages.default;
}

export function getSimilarLanguage(language: string): string | undefined {
  return ownValue(localization.languages.similar, language);
}

export function render(
  text: string,
  params: Record<string, string | number | boolean>,
): string {
  return Object.entries(params).reduce(
    (rendered, [key, value]) =>
      rendered.replace(new RegExp(`%${key}`, 'g'), String(value)),
    text,
  );
}
