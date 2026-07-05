export function parseStatValue(value: string): {
  prefix: string;
  num: number;
  suffix: string;
  decimals: number;
} {
  const m = value.match(/^([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return { prefix: value, num: 0, suffix: "", decimals: 0 };
  const numeric = m[2].replace(/,/g, "");
  const dot = numeric.indexOf(".");
  return {
    prefix: m[1],
    num: parseFloat(numeric),
    suffix: m[3],
    decimals: dot === -1 ? 0 : numeric.length - dot - 1,
  };
}
