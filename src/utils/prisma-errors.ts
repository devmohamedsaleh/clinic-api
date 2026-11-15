export function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
export function isExclusionViolation(error: unknown): boolean {
  const seen = new Set<unknown>();

  function scan(value: unknown, depth: number): boolean {
    if (depth > 6 || value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value === '23P01' || value.includes('exclusion constraint');
    }

    if (typeof value !== 'object' || seen.has(value)) {
      return false;
    }
    seen.add(value);

    const record = value as Record<string, unknown>;
    return (
      scan(record.code, depth + 1) ||
      scan(record.message, depth + 1) ||
      scan(record.cause, depth + 1) ||
      Object.values(record).some((child) => scan(child, depth + 1))
    );
  }

  return scan(error, 0);
}