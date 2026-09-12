import {
  LocalizationTemplate,
  getDefaultLanguage,
  getSimilarLanguage,
  getTemplate,
  render,
} from './localization';

export class LocaleNotFoundError extends Error {
  constructor(public readonly localeName: string) {
    super(`Locale "${localeName}" not found`);
  }
}

function translationFor(
  template: LocalizationTemplate,
  language: string | undefined,
): string | undefined {
  if (!language) return undefined;

  return Object.prototype.hasOwnProperty.call(template, language)
    ? template[language]
    : undefined;
}

export function getText(
  code: string,
  language: string = getDefaultLanguage(),
  params: Record<string, string | number | boolean> = {},
): string {
  const template = getTemplate(code);
  if (!template) throw new LocaleNotFoundError(code);

  const requested = translationFor(template, language);
  if (requested) return render(requested, params);

  const similar = translationFor(template, getSimilarLanguage(language));
  if (similar) return render(similar, params);

  return render(template[getDefaultLanguage()], params);
}
