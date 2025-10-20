export function buildCacheKey(key: string, prefix?: string): string {
  return prefix ? `${prefix}:${key}` : key;
}

export function derivePrefixFromKey(key: string): string {
  return key.split(':')[0] || 'default';
}
