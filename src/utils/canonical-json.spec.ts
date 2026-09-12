import { canonicalJson } from '@/utils/canonical-json';

describe('canonicalJson', () => {
  it('should sort object keys', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('should sort object keys recursively', () => {
    expect(canonicalJson({ outer: { z: [{ y: 1, x: 2 }], a: true } })).toBe(
      '{"outer":{"a":true,"z":[{"x":2,"y":1}]}}',
    );
  });

  it('should produce identical output for differently ordered objects', () => {
    expect(canonicalJson({ a: 1, b: { c: 2, d: 3 } })).toBe(
      canonicalJson({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it('should preserve array order', () => {
    expect(canonicalJson(['b', 'a', 'c'])).toBe('["b","a","c"]');
  });

  it('should drop undefined properties the way JSON.stringify does', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
  });

  it('should write undefined array items as null the way JSON.stringify does', () => {
    expect(canonicalJson([1, undefined, 2])).toBe('[1,null,2]');
  });

  it('should serialise dates as ISO strings', () => {
    expect(canonicalJson({ at: new Date('2026-09-10T00:00:00.000Z') })).toBe(
      '{"at":"2026-09-10T00:00:00.000Z"}',
    );
  });

  it('should serialise null and primitives', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson('text')).toBe('"text"');
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson(false)).toBe('false');
  });
});
