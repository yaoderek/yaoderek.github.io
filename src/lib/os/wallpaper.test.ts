import { describe, expect, test } from 'vitest';
import {
  BIG_SUR_FRAMES,
  BIG_SUR_SCHEDULE,
  frameForSun,
  guessLocation,
  sunPosition,
} from './wallpaper';

// Seattle, for real-world sunrise and sunset times to check against.
const SEATTLE = { lat: 47.6062, lon: -122.3321 };

function frameAt(iso: string, { lat, lon } = SEATTLE): number {
  const { altitude, hourAngle } = sunPosition(new Date(iso), lat, lon);
  return frameForSun(altitude, hourAngle < 0);
}

describe('sunPosition', () => {
  test('the summer-solstice noon sun stands at 90° − latitude + 23.4°', () => {
    // Solar noon in Seattle on June 21 falls around 1:12 pm PDT.
    const { altitude, hourAngle } = sunPosition(
      new Date('2026-06-21T20:12:00Z'),
      SEATTLE.lat,
      SEATTLE.lon
    );
    expect(altitude).toBeCloseTo(90 - SEATTLE.lat + 23.44, 0);
    expect(Math.abs(hourAngle)).toBeLessThan(1);
  });

  test('the sun crosses the horizon at the published sunrise and sunset', () => {
    // Seattle, June 21 2026: sunrise 5:11 am, sunset 9:11 pm PDT.
    const rise = sunPosition(new Date('2026-06-21T12:11:00Z'), SEATTLE.lat, SEATTLE.lon);
    const set = sunPosition(new Date('2026-06-22T04:11:00Z'), SEATTLE.lat, SEATTLE.lon);
    expect(Math.abs(rise.altitude)).toBeLessThan(1.5);
    expect(rise.hourAngle).toBeLessThan(0);
    expect(Math.abs(set.altitude)).toBeLessThan(1.5);
    expect(set.hourAngle).toBeGreaterThan(0);
  });
});

describe('frameForSun', () => {
  test('every frame in the file is reachable', () => {
    const frames = new Set(BIG_SUR_SCHEDULE.map((s) => s.frame));
    expect(frames.size).toBe(BIG_SUR_FRAMES);
  });

  test('morning and evening at the same height get different frames', () => {
    expect(frameForSun(0, true)).toBe(3); // sunrise
    expect(frameForSun(0, false)).toBe(6); // sunset
    expect(frameForSun(-9, true)).toBe(2); // before dawn
    expect(frameForSun(-9, false)).toBe(7); // dusk
  });

  test('high sun is day and deep night is night, either side of noon', () => {
    expect(frameForSun(60, true)).toBe(4);
    expect(frameForSun(60, false)).toBe(4);
    expect(frameForSun(-50, true)).toBe(1);
    expect(frameForSun(-50, false)).toBe(1);
  });
});

describe('a day in Seattle', () => {
  test('runs night, dawn, sunrise, day, sunset, dusk, night', () => {
    expect(frameAt('2026-06-21T07:00:00Z')).toBe(1); // midnight PDT
    expect(frameAt('2026-06-21T11:30:00Z')).toBe(2); // 4:30 am
    expect(frameAt('2026-06-21T12:11:00Z')).toBe(3); // sunrise
    expect(frameAt('2026-06-21T13:20:00Z')).toBe(0); // 6:20 am
    expect(frameAt('2026-06-21T20:00:00Z')).toBe(4); // 1 pm
    expect(frameAt('2026-06-22T03:00:00Z')).toBe(5); // 8 pm
    expect(frameAt('2026-06-22T04:11:00Z')).toBe(6); // sunset
    expect(frameAt('2026-06-22T05:00:00Z')).toBe(7); // 10 pm
  });

  test('a winter 5 pm is already past sunset', () => {
    // December sunset in Seattle is 4:20 pm PST.
    expect(frameAt('2026-12-21T01:00:00Z')).toBe(7);
  });
});

describe('guessLocation', () => {
  test('a northern zone with daylight saving sits at its standard meridian', () => {
    // Seattle: UTC−8 in January, UTC−7 in July.
    expect(guessLocation(480, 420)).toEqual({ lat: 40, lon: -120 });
  });

  test('daylight saving in January puts the visitor south of the equator', () => {
    // Sydney: UTC+11 in January, UTC+10 in July.
    expect(guessLocation(-660, -600)).toEqual({ lat: -35, lon: 150 });
  });

  test('a zone without daylight saving keeps its one offset', () => {
    // Taipei: UTC+8 all year.
    expect(guessLocation(-480, -480)).toEqual({ lat: 40, lon: 120 });
  });
});
