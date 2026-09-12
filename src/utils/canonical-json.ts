export function canonicalJson(value: unknown): string {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (value === undefined) {
    return 'null';
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${(value as unknown[]).map((item) => canonicalJson(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : 1));

  const body = entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(',');

  return `{${body}}`;
}
