const MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** "30m", "14d" 같은 문자열을 밀리초로 변환한다. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`잘못된 duration 문자열입니다: ${input}`);
  }
  const [, value, unit] = match;
  return Number(value) * MULTIPLIERS[unit];
}
