/**
 * Format number to short format (1k, 10k, 1m, etc.)
 */
export function formatNumberShort(num: number): string {
  if (num < 1000) {
    return num.toString();
  }

  if (num < 1000000) {
    const k = Math.floor(num / 1000);
    const remainder = num % 1000;

    // If remainder is 0, just show k
    if (remainder === 0) {
      return `${k}k`;
    }

    // If remainder is less than 100, show with 1 decimal place
    if (remainder < 100) {
      const formatted = (num / 1000).toFixed(1);
      // Remove .0 if it's a whole number
      return formatted.endsWith('.0') ? `${Math.floor(num / 1000)}k` : `${formatted}k`;
    }

    // Otherwise, round to nearest k
    return `${Math.round(num / 1000)}k`;
  }

  if (num < 1000000000) {
    const m = Math.floor(num / 1000000);
    const remainder = num % 1000000;

    // If remainder is 0, just show m
    if (remainder === 0) {
      return `${m}m`;
    }

    // If remainder is less than 100000, show with 1 decimal place
    if (remainder < 100000) {
      const formatted = (num / 1000000).toFixed(1);
      // Remove .0 if it's a whole number
      return formatted.endsWith('.0') ? `${Math.floor(num / 1000000)}m` : `${formatted}m`;
    }

    // Otherwise, round to nearest m
    return `${Math.round(num / 1000000)}m`;
  }

  // For billions
  const b = Math.floor(num / 1000000000);
  const remainder = num % 1000000000;

  if (remainder === 0) {
    return `${b}b`;
  }

  if (remainder < 100000000) {
    const formatted = (num / 1000000000).toFixed(1);
    // Remove .0 if it's a whole number
    return formatted.endsWith('.0') ? `${Math.floor(num / 1000000000)}b` : `${formatted}b`;
  }

  return `${Math.round(num / 1000000000)}b`;
}
