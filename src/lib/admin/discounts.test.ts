import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
  israelDateValue,
  parseAmount,
  parseIsraelDate,
  parsePercent,
  windowStatus,
} from './discounts';

describe('parseIsraelDate', () => {
  it('reads a day in Israel time, summer and winter', () => {
    // Israel is UTC+3 in summer, UTC+2 in winter.
    expect(parseIsraelDate('2026-07-01')?.toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(parseIsraelDate('2026-12-01')?.toISOString()).toBe('2026-11-30T22:00:00.000Z');
    expect(parseIsraelDate('2026-12-01', true)?.toISOString()).toBe('2026-12-01T21:59:59.000Z');
  });

  it('refuses what is not a date, and round-trips one that is', () => {
    expect(parseIsraelDate('next week')).toBeNull();
    expect(israelDateValue(parseIsraelDate('2026-10-20'))).toBe('2026-10-20');
    expect(israelDateValue(parseIsraelDate('2026-10-20', true))).toBe('2026-10-20');
  });
});

describe('amounts', () => {
  it('reads percentages and shekels as typed', () => {
    expect(parsePercent('15')).toBe(1500);
    expect(parsePercent('12.5%')).toBe(1250);
    expect(parsePercent('0')).toBeNull();
    expect(parsePercent('120')).toBeNull();
    expect(parseAmount('₪1,200')).toBe(120_000);
    expect(parseAmount('-5')).toBeNull();
  });
});

describe('windowStatus', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  it('says whether a sale is on, waiting, over or switched off', () => {
    expect(windowStatus({ isActive: true, startsAt: null, endsAt: null }, now)).toBe('live');
    expect(
      windowStatus({ isActive: true, startsAt: new Date('2026-11-01'), endsAt: null }, now),
    ).toBe('scheduled');
    expect(
      windowStatus({ isActive: true, startsAt: null, endsAt: new Date('2026-10-01') }, now),
    ).toBe('ended');
    expect(windowStatus({ isActive: false, startsAt: null, endsAt: null }, now)).toBe('off');
  });
});
