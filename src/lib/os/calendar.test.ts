import { describe, it, expect } from 'vitest';
import {
  calendarIconUrl,
  experienceRoles,
  homeOffset,
  latestOffset,
  offsetToShow,
  roleAt,
  timeline,
} from './calendar';
import type { ExperienceItem, FSNode } from './types';

function role(
  id: string,
  start: string,
  end?: string,
  calendar: ExperienceItem['calendar'] = 'work'
): ExperienceItem {
  return {
    id,
    org: id,
    role: 'Engineer',
    calendar,
    start,
    ...(end ? { end } : {}),
    highlights: [`${id} did things`],
  };
}

/** A tree shaped like the real one: the roles ride on the folder node. */
function tree(roles: ExperienceItem[]): FSNode {
  return {
    name: "derek's mac",
    path: '/',
    kind: 'Folder',
    icon: 'folder',
    children: [
      {
        name: 'experience',
        path: '/experience',
        kind: 'Folder',
        icon: 'folder',
        open: { app: 'calendar', props: { roles, role: null } },
        children: roles.map((r) => ({
          name: `${r.id}.ics`,
          path: `/experience/${r.id}`,
          kind: 'Calendar Event',
          icon: 'calendar',
          open: { app: 'calendar', props: { role: r.id } },
        })),
      },
    ],
  };
}

const contour = role('contour', '2026-06-01');
const oracle = role('oracle', '2025-12-01', '2026-04-30');
const lab = role('lab', '2025-10-01', undefined, 'research');

describe('experienceRoles', () => {
  it('reads the roles off the experience folder', () => {
    expect(experienceRoles(tree([contour, oracle])).map((r) => r.id)).toEqual([
      'contour',
      'oracle',
    ]);
  });

  it('returns nothing for a tree with no experience folder', () => {
    const bare: FSNode = {
      name: "derek's mac",
      path: '/',
      kind: 'Folder',
      icon: 'folder',
      children: [],
    };
    expect(experienceRoles(bare)).toEqual([]);
  });
});

describe('roleAt', () => {
  const roles = [contour, oracle];

  it('finds a role by id', () => {
    expect(roleAt(roles, 'oracle')?.org).toBe('oracle');
  });

  it('returns null for an unknown or missing id', () => {
    expect(roleAt(roles, 'nope')).toBeNull();
    expect(roleAt(roles, null)).toBeNull();
  });
});

describe('timeline', () => {
  // Mid-September 2026, so the opening grid runs Oct 2025 → Sep 2026.
  const today = new Date(2026, 8, 15);
  const swim = role('swim', '2024-12-01', '2025-03-31', 'athletics');

  it('opens on the twelve months ending with this one', () => {
    const { months } = timeline([contour, oracle, lab], today);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ label: 'Oct', year: 2025, month: 10 });
    expect(months[11]).toEqual({ label: 'Sep', year: 2026, month: 9 });
  });

  it('spans whole months at both ends', () => {
    const { bars } = timeline([oracle], today);
    // Dec 2025 through Apr 2026 is five months, counting both ends.
    expect(bars[0].from).toBe(2);
    expect(bars[0].span).toBe(5);
    expect(bars[0].running).toBe(false);
  });

  it('runs an unfinished role up to today', () => {
    const { bars } = timeline([contour], today);
    // Jun through Sep 2026, the last four columns.
    expect(bars[0].from).toBe(8);
    expect(bars[0].span).toBe(4);
    expect(bars[0].running).toBe(true);
  });

  it('puts today part-way through the current month', () => {
    const at = timeline([contour], today).today!;
    // The last column, about half way through September.
    expect(Math.floor(at)).toBe(11);
    expect(at - 11).toBeCloseTo(14 / 30, 5);
  });

  it('leaves out roles from before the months on screen', () => {
    expect(timeline([swim, contour], today).bars.map((b) => b.role.id)).toEqual([
      'contour',
    ]);
  });

  it('pages back by the offset, and drops today once it is behind', () => {
    // Oct 2024 through Sep 2025: the swimming is in it, the lab starts after.
    const { months, bars, today: at } = timeline([swim, lab], today, -12);
    expect(months[0]).toEqual({ label: 'Oct', year: 2024, month: 10 });
    expect(months[11]).toEqual({ label: 'Sep', year: 2025, month: 9 });
    expect(at).toBeNull();
    expect(bars.map((b) => b.role.id)).toEqual(['swim']);
    // Dec 2024 through Mar 2025, whole and uncut.
    expect(bars[0].from).toBe(2);
    expect(bars[0].span).toBe(4);
    expect(bars[0].clippedStart).toBe(false);
    expect(bars[0].clippedEnd).toBe(false);
  });

  it('cuts a role off at the edge it runs past, and says so', () => {
    // Apr 2025 through Mar 2026: the lab starts inside it and is still going.
    const running = timeline([lab], today, -6).bars[0];
    expect(running.from).toBe(6);
    expect(running.span).toBe(6);
    expect(running.clippedEnd).toBe(true);
    expect(running.clippedStart).toBe(false);

    // Feb 2025 through Jan 2026: the swimming had already started.
    const started = timeline([swim], today, -8).bars[0];
    expect(started.from).toBe(0);
    expect(started.span).toBe(2);
    expect(started.clippedStart).toBe(true);
    expect(started.clippedEnd).toBe(false);
  });

  it('honours a shorter span, for a phone', () => {
    const { months } = timeline([contour], today, 0, 6);
    expect(months).toHaveLength(6);
    expect(months[0]).toEqual({ label: 'Apr', year: 2026, month: 4 });
  });

  it('draws an empty grid when no role reaches it', () => {
    const { months, bars } = timeline([contour], today, -48);
    expect(months).toHaveLength(12);
    expect(bars).toEqual([]);
  });
});

describe('roles that have not started', () => {
  // Late November 2026, with an internship booked for the winter.
  const today = new Date(2026, 10, 24);
  const stripe = role('stripe', '2027-01-01', '2027-03-31');

  it('leaves the present as the last month when nothing is ahead', () => {
    expect(latestOffset([contour, oracle, lab], today)).toBe(0);
    expect(homeOffset([contour, oracle, lab], today)).toBe(0);
    expect(latestOffset([], today)).toBe(0);
  });

  it('reaches ahead to the last month of an upcoming role', () => {
    expect(latestOffset([stripe, contour, lab], today)).toBe(4);
    expect(homeOffset([stripe, contour, lab], today)).toBe(4);
  });

  it('never opens so far ahead that today is off the grid', () => {
    const far = role('far', '2028-01-01', '2028-06-30');
    expect(latestOffset([far], today)).toBe(19);
    expect(homeOffset([far], today, 6)).toBe(5);
    expect(timeline([far], today, 5, 6).today).not.toBeNull();
  });

  it('draws the upcoming role past today, and stops running ones at it', () => {
    const { months, bars, today: at } = timeline([stripe, lab], today, 4);
    expect(months[11]).toEqual({ label: 'Mar', year: 2027, month: 3 });
    const [ahead, running] = bars;
    expect(ahead.from).toBe(9);
    expect(ahead.span).toBe(3);
    expect(ahead.running).toBe(false);
    expect(running.from + running.span - 1).toBe(7);
    expect(Math.floor(at!)).toBe(7);
  });

  it('draws an upcoming role with no end as its first month, not as running', () => {
    const open = role('open', '2027-01-01');
    expect(latestOffset([open], today)).toBe(2);
    const bar = timeline([open], today, 2).bars[0];
    expect(bar.from).toBe(11);
    expect(bar.span).toBe(1);
    expect(bar.running).toBe(false);
  });

  it('travels ahead to it, no further than the last booked month', () => {
    expect(offsetToShow(stripe, today, -12, 12, 4)).toBe(4);
  });
});

describe('offsetToShow', () => {
  const today = new Date(2026, 8, 15);
  const swim = role('swim', '2024-12-01', '2025-03-31', 'athletics');

  it('stays put when the role is already on screen', () => {
    expect(offsetToShow(contour, today, 0)).toBe(0);
  });

  it('travels back to a role that is off the window', () => {
    // Swimming ended Mar 2025, 18 months back, so the window ends Apr 2025.
    expect(offsetToShow(swim, today, 0)).toBe(-17);
  });

  it('never lands on a window past the present', () => {
    expect(offsetToShow(contour, today, -36)).toBe(0);
  });
});

describe('calendarIconUrl', () => {
  it('draws the day it is, the way the Calendar tile does', () => {
    const url = calendarIconUrl(new Date(2026, 8, 3)); // Thursday
    const svg = decodeURIComponent(url.replace('data:image/svg+xml,', ''));
    expect(svg).toContain('THU');
    expect(svg).toContain('>3<');
  });
});
