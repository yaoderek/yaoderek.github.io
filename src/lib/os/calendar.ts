/**
 * The Calendar app's view of the filesystem.
 *
 * Roles are events: each one runs from the month it started to the month it
 * ended, or to today when it's still running. The app draws them as bars on a
 * month grid, so everything here is month arithmetic — days never matter.
 *
 * The grid shows a fixed run of months ending at `offset` months from this
 * one, which is what the arrows in the app move: 0 is the present, -6 is half
 * a year back, and there's no floor on how far back a visitor can go.
 *
 * The roles are read back off the /experience folder node, the same way Photos
 * reads its albums, so a role is serialized once.
 */

import type { ExperienceItem, FSNode } from './types';
import { findNode } from './fs';

/** A named calendar, which is how a role gets its colour. */
export type CalendarId = ExperienceItem['calendar'];

export const CALENDARS: { id: CalendarId; title: string }[] = [
  { id: 'work', title: 'Work' },
  { id: 'research', title: 'Research' },
  { id: 'athletics', title: 'Athletics' },
];

/** Months on screen at once, on a window and on a phone. */
export const TIMELINE_SPAN = 12;
export const COMPACT_SPAN = 6;

/**
 * A role placed on the month grid: `from` and `span` are month columns. A role
 * that runs past either edge is cut off there, and says so, since a bar that
 * stopped at the edge would read as a role that ended.
 */
export type RoleBar = {
  role: ExperienceItem;
  from: number;
  span: number;
  running: boolean;
  clippedStart: boolean;
  clippedEnd: boolean;
};

/** The grid a set of roles is drawn on: one column per month on screen. */
export type Timeline = {
  months: { label: string; year: number; month: number }[];
  bars: RoleBar[];
  /**
   * Today's position in month columns, fractional through the month, or null
   * when the visitor has paged back past it.
   */
  today: number | null;
};

/** Every role in the tree, newest first. */
export function experienceRoles(tree: FSNode): ExperienceItem[] {
  const roles = findNode(tree, '/experience')?.open?.props.roles as
    | ExperienceItem[]
    | undefined;
  return roles ?? [];
}

/** The role with this id, or null when nothing matches. */
export function roleAt(
  roles: ExperienceItem[],
  id: string | null
): ExperienceItem | null {
  if (id === null) return null;
  return roles.find((role) => role.id === id) ?? null;
}

/**
 * Lay the roles out on the `span` months ending `offset` months from this one.
 * Roles outside that run are left off; roles that cross an edge are cut there.
 *
 * A bar covers whole months at both ends, which is how a résumé reads: a job
 * from June to September is four months long, not three and a bit.
 */
export function timeline(
  roles: ExperienceItem[],
  today: Date,
  offset = 0,
  span = TIMELINE_SPAN
): Timeline {
  const now = monthIndex(today.getFullYear(), today.getMonth() + 1);
  const last = now + offset;
  const first = last - span + 1;

  const months = [];
  for (let i = first; i <= last; i++) {
    const year = Math.floor(i / 12);
    const month = (i % 12) + 1;
    months.push({ label: MONTH_LABELS[month - 1], year, month });
  }

  const bars: RoleBar[] = [];
  for (const role of roles) {
    const start = monthOf(role.start);
    const end = role.end ? monthOf(role.end) : now;
    if (end < first || start > last) continue;

    const from = Math.max(start, first);
    const to = Math.min(end, last);
    bars.push({
      role,
      from: from - first,
      span: to - from + 1,
      running: role.end === undefined,
      clippedStart: start < first,
      clippedEnd: end > last,
    });
  }

  // Part-way through the current month, so the line lands where today is.
  const at = now - first + (today.getDate() - 1) / daysInMonth(today);
  return { months, bars, today: at >= 0 && at <= span ? at : null };
}

/**
 * The offset that brings a role into view: the current one when the role is
 * already on screen, otherwise a window ending just after the role does.
 *
 * Deep links land on a role that may be years back, so the grid has to travel
 * to it rather than leave the visitor to page there.
 */
export function offsetToShow(
  role: ExperienceItem,
  today: Date,
  offset: number,
  span = TIMELINE_SPAN
): number {
  const now = monthIndex(today.getFullYear(), today.getMonth() + 1);
  const last = now + offset;
  const first = last - span + 1;
  const start = monthOf(role.start);
  const end = role.end ? monthOf(role.end) : now;

  if (end >= first && start <= last) return offset;
  // A month of room after the role, and never a window past the present.
  return Math.min(0, end - now + 1);
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Months since year zero, the unit the grid counts in. */
function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function monthOf(iso: string): number {
  const [year, month] = iso.split('-').map(Number);
  return monthIndex(year, month);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * The dock icon: the Calendar tile shows the day it is, so it's drawn rather
 * than shipped as an image. Built as an SVG data URL so the dock can treat it
 * like any other icon.
 *
 * macOS app icons leave about a tenth of the canvas clear on every side, and
 * the shipped icons next to this one do, so the tile is inset the same way to
 * sit level with them.
 */
export function calendarIconUrl(today: Date): string {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
    .format(today)
    .toUpperCase();
  const day = today.getDate();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<rect x="12" y="12" width="104" height="104" rx="23" fill="#fff"/>
<path d="M12 35A23 23 0 0 1 35 12h58a23 23 0 0 1 23 23v10H12z" fill="#e8524a"/>
<text x="64" y="37" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="16.5" font-weight="600" fill="#fff" text-anchor="middle">${weekday}</text>
<text x="64" y="103" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="62" font-weight="300" fill="#1d1d1f" text-anchor="middle">${day}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
