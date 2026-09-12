import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

type LocalizationModule = typeof import('./index');

const validYaml = `
languages:
  default: en
  similar:
    be: ru
    kk: ru
    uk: ru

templates:
  GREETING:
    en: 'Hello %name, you are %role'
    ru: 'Привет, %name, ты %role'

  REPEATED:
    en: '%name and %name again'

  ENGLISH_ONLY:
    en: 'English only'
`;

const missingDefaultYaml = `
languages:
  default: en
  similar: {}

templates:
  BROKEN:
    ru: 'Только русский'
`;

const unknownLanguageYaml = `
languages:
  default: en
  similar: {}

templates:
  GREETING:
    en: 'Hello'
    zz: 'Hello'
`;

const emptyTextYaml = `
languages:
  default: en
  similar: {}

templates:
  GREETING:
    en: ''
`;

describe('localization', () => {
  const originalYamlPath = process.env.LOCALIZATION_YAML_PATH;
  let fixtureDir: string;

  const writeFixture = (name: string, contents: string): string => {
    const file = path.join(fixtureDir, name);
    writeFileSync(file, contents, 'utf-8');
    return file;
  };

  const load = (yamlPath?: string): LocalizationModule => {
    if (yamlPath) {
      process.env.LOCALIZATION_YAML_PATH = yamlPath;
    } else {
      delete process.env.LOCALIZATION_YAML_PATH;
    }

    jest.resetModules();
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    return require('./index') as LocalizationModule;
  };

  beforeAll(() => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'profile-l10n-'));
  });

  afterAll(() => {
    if (originalYamlPath === undefined) {
      delete process.env.LOCALIZATION_YAML_PATH;
    } else {
      process.env.LOCALIZATION_YAML_PATH = originalYamlPath;
    }
    jest.resetModules();
  });

  describe('getText', () => {
    let file: string;

    beforeAll(() => {
      file = writeFixture('valid.yaml', validYaml);
    });

    it('should resolve the exact language, then a similar one, then the default', () => {
      const { getText } = load(file);
      const params = { name: 'Никита', role: 'инженер' };

      expect(getText('GREETING', 'ru', params)).toBe(
        'Привет, Никита, ты инженер',
      );
      expect(getText('GREETING', 'uk', params)).toBe(
        'Привет, Никита, ты инженер',
      );
      expect(
        getText('GREETING', 'de', { name: 'Nikita', role: 'an engineer' }),
      ).toBe('Hello Nikita, you are an engineer');
    });

    it('should fall back to the default language when the template lacks the requested one', () => {
      const { getText } = load(file);

      expect(getText('ENGLISH_ONLY', 'ru')).toBe('English only');
      expect(getText('ENGLISH_ONLY')).toBe('English only');
    });

    it('should substitute every occurrence of a placeholder', () => {
      const { getText } = load(file);

      expect(getText('REPEATED', 'en', { name: 'Nikita' })).toBe(
        'Nikita and Nikita again',
      );
      expect(getText('REPEATED', 'en', { name: 42 })).toBe('42 and 42 again');
    });

    it('should not resolve inherited object keys', () => {
      const { getText, LocaleNotFoundError } = load(file);

      expect(() => getText('constructor')).toThrow(LocaleNotFoundError);
      expect(() => getText('__proto__')).toThrow(LocaleNotFoundError);
      expect(getText('ENGLISH_ONLY', '__proto__')).toBe('English only');
    });

    it('should throw LocaleNotFoundError for an unknown code', () => {
      const { getText, LocaleNotFoundError } = load(file);

      expect(() => getText('NO_SUCH_CODE')).toThrow(LocaleNotFoundError);
      expect(() => getText('NO_SUCH_CODE')).toThrow(
        'Locale "NO_SUCH_CODE" not found',
      );
    });
  });

  describe('import-time validation', () => {
    it('should throw when a template is missing the default language', () => {
      expect(() =>
        load(writeFixture('missing-default.yaml', missingDefaultYaml)),
      ).toThrow('Missing default lang (en) for BROKEN');
    });

    it('should throw when a language code is not ISO-639-1', () => {
      expect(() =>
        load(writeFixture('unknown-language.yaml', unknownLanguageYaml)),
      ).toThrow('zz is not a language code');
    });

    it('should throw when a template text is empty', () => {
      expect(() =>
        load(writeFixture('empty-text.yaml', emptyTextYaml)),
      ).toThrow('Template GREETING is invalid: empty string');
    });

    it('should throw when the file does not exist', () => {
      expect(() => load(path.join(fixtureDir, 'absent.yaml'))).toThrow(
        'ENOENT',
      );
    });
  });

  describe('assets/localization.yaml', () => {
    it('should render the shipped templates in English and Russian', () => {
      const { getText } = load();

      expect(getText('ERR_PROFILE_NOT_FOUND', 'en', { slug: 'onezee' })).toBe(
        'Profile "onezee" was not found',
      );
      expect(getText('ERR_PROFILE_NOT_FOUND', 'ru', { slug: 'onezee' })).toBe(
        'Профиль "onezee" не найден',
      );
      expect(getText('UNKNOWN_SERVER_ERROR', 'en')).toBe(
        'Something went wrong',
      );
      expect(getText('UNKNOWN_SERVER_ERROR', 'ru')).toBe('Что-то пошло не так');
    });

    it('should fold be, kk and uk onto Russian', () => {
      const { getText } = load();

      for (const language of ['be', 'kk', 'uk']) {
        expect(
          getText('ERR_PROFILE_NOT_FOUND', language, { slug: 'onezee' }),
        ).toBe('Профиль "onezee" не найден');
      }
    });
  });
});
