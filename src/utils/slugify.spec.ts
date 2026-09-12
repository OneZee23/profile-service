import { slugify } from './slugify';

describe('slugify', () => {
  it('collapses dots and slashes in a compound skill name', () => {
    expect(slugify('Node.js / TypeScript')).toBe('node-js-typescript');
  });

  it('lowercases and joins words with a single dash', () => {
    expect(slugify('Senior Backend Engineer')).toBe('senior-backend-engineer');
  });

  it('keeps digits', () => {
    expect(slugify('PostgreSQL 16')).toBe('postgresql-16');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  iMe Lab!  ')).toBe('ime-lab');
  });

  it('drops characters with no ascii slug form', () => {
    expect(slugify('C++')).toBe('c');
  });
});
