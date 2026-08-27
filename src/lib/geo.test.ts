import { describe, expect, it } from 'vitest';
import { haversineMeters, isPlausiblePing, metersToMiles, mpsToMph } from './geo';

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 45.0563, lng: -92.8055 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('approximates the known distance between Stillwater, MN and Gerlach, NV', () => {
    const stillwater = { lat: 45.0563, lng: -92.8055 };
    const gerlach = { lat: 40.6516, lng: -119.3609 };
    const miles = metersToMiles(haversineMeters(stillwater, gerlach));
    // Great-circle distance is ~1440 miles; allow slack since it's a straight-line, not driving, distance.
    expect(miles).toBeGreaterThan(1300);
    expect(miles).toBeLessThan(1550);
  });
});

describe('metersToMiles', () => {
  it('converts using the standard meters-per-mile constant', () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
    expect(metersToMiles(0)).toBe(0);
  });
});

describe('mpsToMph', () => {
  it('converts meters/second to miles/hour', () => {
    expect(mpsToMph(1)).toBeCloseTo(2.236936, 5);
    expect(mpsToMph(0)).toBe(0);
  });
});

describe('isPlausiblePing', () => {
  it('accepts the first ping regardless of accuracy, as long as it is not too poor', () => {
    expect(isPlausiblePing(null, { lat: 1, lng: 1, timestamp: 1000, accuracy: 10 })).toBe(true);
  });

  it('rejects a ping with poor accuracy (>50m)', () => {
    expect(isPlausiblePing(null, { lat: 1, lng: 1, timestamp: 1000, accuracy: 51 })).toBe(false);
  });

  it('accepts a null accuracy reading (unknown, not necessarily poor)', () => {
    expect(isPlausiblePing(null, { lat: 1, lng: 1, timestamp: 1000, accuracy: null })).toBe(true);
  });

  it('rejects a non-positive time delta from the previous ping', () => {
    const prev = { lat: 1, lng: 1, timestamp: 1000 };
    expect(isPlausiblePing(prev, { lat: 1.001, lng: 1, timestamp: 1000, accuracy: 10 })).toBe(false);
    expect(isPlausiblePing(prev, { lat: 1.001, lng: 1, timestamp: 500, accuracy: 10 })).toBe(false);
  });

  it('rejects a jump that implies an impossible speed for a towed trailer', () => {
    const prev = { lat: 45.0, lng: -93.0, timestamp: 1000 };
    // ~111km away one second later implies an impossible speed.
    const next = { lat: 46.0, lng: -93.0, timestamp: 2000, accuracy: 10 };
    expect(isPlausiblePing(prev, next)).toBe(false);
  });

  it('accepts a plausible highway-speed jump', () => {
    const prev = { lat: 45.0, lng: -93.0, timestamp: 0 };
    // ~0.28 miles in 15 seconds is about 67mph — plausible while towing.
    const next = { lat: 45.004, lng: -93.0, timestamp: 15000, accuracy: 10 };
    expect(isPlausiblePing(prev, next)).toBe(true);
  });
});
