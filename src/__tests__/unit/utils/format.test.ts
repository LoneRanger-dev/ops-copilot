import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatCost,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
} from '@/lib/utils/format';

describe('formatBytes', () => {
  it('renders whole bytes without a decimal point', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('scales to the largest unit that keeps the value above one', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(26214400)).toBe('25.0 MB');
  });

  it('returns an em dash for negative or non-finite input', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });

  it('treats zero as a value, not as missing data', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});

describe('formatDuration', () => {
  it('uses milliseconds below one second', () => {
    expect(formatDuration(310)).toBe('310ms');
  });

  it('uses seconds with one decimal below one minute', () => {
    expect(formatDuration(1500)).toBe('1.5s');
  });

  it('splits into minutes and seconds beyond a minute', () => {
    expect(formatDuration(95000)).toBe('1m 35s');
  });

  it('splits into hours and minutes beyond an hour', () => {
    expect(formatDuration(3_900_000)).toBe('1h 5m');
  });

  it('returns an em dash for invalid input', () => {
    expect(formatDuration(-5)).toBe('—');
  });
});

describe('date formatting', () => {
  const instant = new Date('2026-07-30T14:22:00.000Z');

  it('formats an absolute date and time', () => {
    expect(formatDateTime(instant)).toMatch(/^30 Jul 2026, \d{2}:\d{2}$/);
  });

  it('formats a date without a time', () => {
    expect(formatDate(instant)).toBe('30 Jul 2026');
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(formatDate('2026-07-30T14:22:00.000Z')).toBe('30 Jul 2026');
  });

  it('returns an em dash rather than "Invalid Date"', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});

describe('formatCost', () => {
  it('keeps four decimals because AI spend is routinely sub-cent', () => {
    expect(formatCost(0.0012)).toBe('$0.0012');
    expect(formatCost(2.14)).toBe('$2.1400');
  });

  it('returns an em dash for invalid input', () => {
    expect(formatCost(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(500000)).toBe('500,000');
  });
});

describe('formatPercent', () => {
  it('converts a 0..1 ratio to a percentage', () => {
    expect(formatPercent(0.342)).toBe('34.2%');
  });

  it('honours the requested precision', () => {
    expect(formatPercent(0.9, 0)).toBe('90%');
  });
});
