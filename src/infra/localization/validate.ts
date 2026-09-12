import { getDefaultLanguage, getTemplateNames } from './localization';

const templateNames = getTemplateNames();
const summary = [
  `Localization is valid: ${templateNames.length} templates`,
  `default language "${getDefaultLanguage()}"`,
].join(', ');

process.stdout.write(`${summary}\n`);
