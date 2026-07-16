import { describe, it, expect } from 'vitest';
import { formatMoney, formatMonth } from '../src/utils/format';

describe('formatMoney', () => {
  it('formats a whole number with two decimals', () => {
    expect(formatMoney(1200)).toBe('1,200.00');
  });

  it('formats a decimal amount', () => {
    expect(formatMoney(42.5)).toBe('42.50');
  });

  it('treats missing values as zero', () => {
    expect(formatMoney(undefined)).toBe('0.00');
  });
});

describe('formatMonth', () => {
  it('renders a YYYY-MM string as short month/year', () => {
    expect(formatMonth('2026-07')).toMatch(/Jul.*26/);
  });

  it('returns empty string for falsy input', () => {
    expect(formatMonth('')).toBe('');
  });
});
