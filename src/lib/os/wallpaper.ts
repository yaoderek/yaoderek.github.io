/**
 * The dynamic Big Sur wallpaper: which of its eight frames is up, by where the
 * sun is for the visitor right now, the way macOS picks it.
 */

/**
 * Apple's own schedule, read out of the `apple_desktop:solar` metadata in
 * "Big Sur.heic": each frame is pinned to a sun altitude and azimuth (degrees).
 * Frame 4 (full day) and frame 1 (night) each cover both halves of the day.
 */
export const BIG_SUR_SCHEDULE: { altitude: number; azimuth: number; frame: number }[] = [
  { altitude: -25, azimuth: 70, frame: 1 }, // night
  { altitude: -9, azimuth: 80, frame: 2 }, // before dawn
  { altitude: 0, azimuth: 90, frame: 3 }, // sunrise
  { altitude: 10, azimuth: 100, frame: 0 }, // morning
  { altitude: 25, azimuth: 110, frame: 4 }, // day
  { altitude: 25, azimuth: 250, frame: 4 }, // day
  { altitude: 10, azimuth: 260, frame: 5 }, // afternoon
  { altitude: 0, azimuth: 270, frame: 6 }, // sunset
  { altitude: -9, azimuth: 280, frame: 7 }, // dusk
  { altitude: -25, azimuth: 290, frame: 1 }, // night
];

export const BIG_SUR_FRAMES = 8;

const RAD = Math.PI / 180;

/**
 * Where the sun is for an observer at `lat`/`lon` (degrees, east positive):
 * its altitude above the horizon, and its hour angle, which is negative
 * before solar noon and positive after. NOAA's low-precision equations, good
 * to well under a degree, which is far finer than the frames are apart.
 */
export function sunPosition(
  date: Date,
  lat: number,
  lon: number
): { altitude: number; hourAngle: number } {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 864e5) + 1;
  const hours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Fractional year, in radians.
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24);
  // Equation of time (minutes) and solar declination (radians).
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  // True solar time (minutes), then the hour angle in [-180, 180).
  const solarMinutes = hours * 60 + eqTime + 4 * lon;
  const hourAngle = ((((solarMinutes / 4 - 180) % 360) + 540) % 360) - 180;

  const cosZenith =
    Math.sin(lat * RAD) * Math.sin(decl) +
    Math.cos(lat * RAD) * Math.cos(decl) * Math.cos(hourAngle * RAD);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
  return { altitude: 90 - zenith, hourAngle };
}

/**
 * The frame for a sun at `altitude`: the scheduled frame on the same side of
 * noon whose altitude is closest. Morning and evening share altitudes, so the
 * side is what tells sunrise from sunset.
 */
export function frameForSun(altitude: number, rising: boolean): number {
  const side = BIG_SUR_SCHEDULE.filter((s) => (s.azimuth < 180) === rising);
  let best = side[0];
  for (const s of side) {
    if (Math.abs(s.altitude - altitude) < Math.abs(best.altitude - altitude)) best = s;
  }
  return best.frame;
}

/**
 * Roughly where a visitor is, from their time zone alone, since asking for
 * their location to paint a wallpaper would be absurd. A zone's standard
 * offset puts it within an hour of its longitude, and daylight saving in
 * January means the southern hemisphere. Offsets are getTimezoneOffset()
 * values (minutes behind UTC) for January 1 and July 1.
 */
export function guessLocation(
  janOffset: number,
  julOffset: number
): { lat: number; lon: number } {
  const standard = Math.max(janOffset, julOffset);
  return { lat: janOffset < julOffset ? -35 : 40, lon: -standard / 4 };
}

/** The frame to show at `date` for a visitor in this browser's time zone. */
export function wallpaperFrame(date: Date): number {
  const year = date.getFullYear();
  const { lat, lon } = guessLocation(
    new Date(year, 0, 1).getTimezoneOffset(),
    new Date(year, 6, 1).getTimezoneOffset()
  );
  const { altitude, hourAngle } = sunPosition(date, lat, lon);
  return frameForSun(altitude, hourAngle < 0);
}
