<script lang="ts">
  import { onMount } from 'svelte';
  import { formatMonthRange } from '../../../lib/os/format';
  import {
    CALENDARS,
    COMPACT_SPAN,
    TIMELINE_SPAN,
    offsetToShow,
    roleAt,
    timeline,
    type CalendarId,
  } from '../../../lib/os/calendar';
  import type { ExperienceItem } from '../../../lib/os/types';

  type Props = {
    roles: ExperienceItem[];
    /** Role to open on. null opens on the most recent one. */
    role?: string | null;
    active?: boolean;
    /** Phone layout: no calendar list, tighter months. */
    compact?: boolean;
  };

  let { roles, role = null, active = false, compact = false }: Props = $props();

  // Which named calendars are ticked, the way Calendar filters its events.
  let shown = $state<Set<CalendarId>>(new Set(CALENDARS.map((c) => c.id)));

  // A window stays open for minutes, so today is read once here rather than on
  // every redraw of the grid.
  const today = new Date();

  const span = $derived(compact ? COMPACT_SPAN : TIMELINE_SPAN);
  // Half a window per press, so a page back keeps some of what was on screen.
  const step = $derived(Math.max(1, Math.round(span / 2)));

  // `role` seeds the selection; the effect below re-targets an open window when
  // the window manager points it at a different role.
  // svelte-ignore state_referenced_locally
  const opened = roleAt(roles, role);
  let selectedId = $state(opened?.id ?? roles[0]?.id ?? null);

  // The grid runs back from the present, except when it was opened on a role
  // from years ago, which it starts on instead.
  let offset = $state(
    opened
      // svelte-ignore state_referenced_locally
      ? offsetToShow(opened, today, 0, compact ? COMPACT_SPAN : TIMELINE_SPAN)
      : 0
  );

  // The props arrive through a spread, so this effect re-runs on any window
  // change (a focus, a drag). Only a genuinely new target moves the selection.
  // svelte-ignore state_referenced_locally
  let lastTarget = role;

  $effect(() => {
    if (role === lastTarget) return;
    lastTarget = role;
    const found = roleAt(roles, role);
    if (!found) return;
    selectedId = found.id;
    // A role from years back is off the opening window, so travel to it.
    offset = offsetToShow(found, today, offset, span);
  });

  // Hiding a calendar hides its bars and what's written about them.
  const listed = $derived(roles.filter((entry) => shown.has(entry.calendar)));
  const grid = $derived(timeline(listed, today, offset, span));
  // The panel keeps the role it's on even when a page moves its bar off the
  // grid: paging is navigation, not a change of subject.
  const selected = $derived(
    listed.find((entry) => entry.id === selectedId) ?? listed[0] ?? null
  );
  const range = $derived(
    grid.months.length === 0
      ? ''
      : `${grid.months[0].label} ${grid.months[0].year} – ${
          grid.months[grid.months.length - 1].label
        } ${grid.months[grid.months.length - 1].year}`
  );

  function toggle(id: CalendarId) {
    const next = new Set(shown);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    shown = next;
  }

  /** Page the grid. Forward stops at the present: there's nothing ahead. */
  function page(direction: number) {
    offset = Math.min(0, offset + direction * step);
  }

  /** Step through the roles on the grid, the way arrow keys move a selection. */
  function stepSelection(delta: number) {
    const bars = grid.bars;
    if (bars.length === 0) return;
    const at = bars.findIndex((bar) => bar.role.id === selectedId);
    const next = Math.min(Math.max((at < 0 ? 0 : at) + delta, 0), bars.length - 1);
    selectedId = bars[next].role.id;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepSelection(-1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      page(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      page(1);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="cal" class:compact>
  {#if roles.length === 0}
    <div class="empty">
      <p class="empty-title">No events</p>
      <p class="empty-sub">Roles will show up here as they get added.</p>
    </div>
  {:else}
    <header class="bar">
      <span class="bar-title">{range}</span>
      <span class="bar-count">
        {grid.bars.length}
        {grid.bars.length === 1 ? 'event' : 'events'}
      </span>
      <div class="nav">
        <button type="button" onclick={() => page(-1)} aria-label="Earlier months">
          ‹
        </button>
        <button
          class="today"
          type="button"
          onclick={() => (offset = 0)}
          disabled={offset === 0}
        >
          Today
        </button>
        <button
          type="button"
          onclick={() => page(1)}
          disabled={offset === 0}
          aria-label="Later months"
        >
          ›
        </button>
      </div>
    </header>

    <div class="body">
      {#if !compact}
        <aside class="calendars">
          <p class="side-title">Calendars</p>
          {#each CALENDARS as entry (entry.id)}
            <label class="check">
              <input
                type="checkbox"
                checked={shown.has(entry.id)}
                onchange={() => toggle(entry.id)}
              />
              <span class="swatch" style:background={`var(--cal-${entry.id})`}></span>
              <span class="check-label">{entry.title}</span>
            </label>
          {/each}
        </aside>
      {/if}

      <div class="right">
        <div class="scroll">
          <div
            class="track"
            style:--cols={grid.months.length}
            style:--lanes={roles.length}
          >
            <div class="months">
              {#each grid.months as month (`${month.year}-${month.month}`)}
                <span class="month" class:january={month.month === 1}>
                  {month.label}
                  {#if month.month === 1}<em>{month.year}</em>{/if}
                </span>
              {/each}
            </div>

            <div class="rows">
              {#each grid.bars as bar, row (bar.role.id)}
                <button
                  class="event"
                  class:selected={bar.role.id === selectedId}
                  class:running={bar.running}
                  class:clip-start={bar.clippedStart}
                  class:clip-end={bar.clippedEnd}
                  type="button"
                  style:grid-row={row + 1}
                  style:grid-column={`${bar.from + 1} / span ${bar.span}`}
                  style:--tone={`var(--cal-${bar.role.calendar})`}
                  onclick={() => (selectedId = bar.role.id)}
                  aria-label={`${bar.role.org}, ${bar.role.role}, ${formatMonthRange(
                    bar.role.start,
                    bar.role.end
                  )}`}
                >
                  <span class="event-org">{bar.role.org}</span>
                  <span class="event-role">{bar.role.role}</span>
                </button>
              {/each}

              <!-- Today, the red line Calendar draws across the current day.
                   Gone once the visitor pages back past this month. -->
              {#if grid.today !== null}
                <span
                  class="now"
                  style:left={`${(grid.today / grid.months.length) * 100}%`}
                  aria-hidden="true"
                ></span>
              {/if}

              {#if grid.bars.length === 0}
                <p class="quiet">Nothing on the calendar these months.</p>
              {/if}
            </div>
          </div>
        </div>

        {#if selected}
          <section class="detail">
            <header class="detail-head">
              <span
                class="dot"
                style:background={`var(--cal-${selected.calendar})`}
                aria-hidden="true"
              ></span>
              <h2>{selected.org}</h2>
            </header>
            <p class="detail-role">{selected.role}</p>
            <p class="detail-when">
              {formatMonthRange(selected.start, selected.end)}
              {#if selected.note}<span class="detail-note">· {selected.note}</span>{/if}
            </p>
            <ul class="highlights">
              {#each selected.highlights as line (line)}
                <li>{line}</li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .cal {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg);
    font-family: var(--chrome-font);
    color: var(--text);
  }

  /* ---- title bar ---- */
  .bar {
    flex: 0 0 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 12px;
    border-bottom: 0.5px solid var(--hairline);
  }

  .bar-title {
    font-size: 13px;
    font-weight: 600;
  }

  .bar-count {
    flex: 1 1 auto;
    font-size: 11px;
    color: var(--text-dim);
  }

  /* The toolbar's back / today / forward group, as one segmented control. */
  .nav {
    display: flex;
    align-items: stretch;
    border: 0.5px solid var(--hairline);
    border-radius: 6px;
    overflow: hidden;
  }

  .nav button {
    min-width: 26px;
    height: 22px;
    padding: 0 7px;
    font-size: 13px;
    line-height: 1;
    color: var(--text);
  }

  .nav button + button {
    border-left: 0.5px solid var(--hairline);
  }

  .nav button:hover:not(:disabled) {
    background: var(--hover-dim);
  }

  .nav button:disabled {
    color: var(--text-dim);
    cursor: default;
  }

  .nav .today {
    font-size: 11.5px;
  }

  .body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
  }

  /* ---- calendar list ---- */
  .calendars {
    flex: 0 0 168px;
    padding: 12px 10px;
    background: var(--cal-sidebar);
    border-right: 0.5px solid var(--hairline);
  }

  .side-title {
    margin: 0 0 8px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px;
    border-radius: 5px;
    font-size: 12.5px;
    cursor: pointer;
  }

  .check:hover {
    background: var(--hover-dim);
  }

  .check input {
    margin: 0;
    accent-color: var(--accent);
  }

  .swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }

  .check-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---- timeline ---- */
  .right {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .scroll {
    flex: 0 0 auto;
    overflow-x: auto;
    overflow-y: hidden;
    border-bottom: 0.5px solid var(--hairline);
  }

  /* One column per month, stretching when there's room and scrolling when
     there isn't. */
  .track {
    min-width: 100%;
  }

  .months,
  .rows {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(54px, 1fr));
  }

  .months {
    padding: 6px 0 5px;
    border-bottom: 0.5px solid var(--hairline);
  }

  .month {
    font-size: 10.5px;
    color: var(--text-dim);
    text-align: center;
    white-space: nowrap;
  }

  .month.january {
    color: var(--text);
  }

  .month em {
    font-style: normal;
    opacity: 0.65;
  }

  .rows {
    position: relative;
    grid-auto-rows: 30px;
    align-content: start;
    padding: 8px 0 12px;
    row-gap: 4px;
    /* A lane per role, held whether or not the role is on screen: paging or
       hiding a calendar shouldn't resize the timeline under the pointer.
       A lane is a 30px bar and the 4px gap under it, plus the padding. */
    height: calc(var(--lanes) * 34px + 16px);
    /* A month gridline behind every column. */
    background-image: linear-gradient(
      to right,
      var(--cal-grid) 0 1px,
      transparent 1px
    );
    background-size: calc(100% / var(--cols)) 100%;
  }

  .event {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    height: 26px;
    margin: 0 2px;
    padding: 0 9px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--tone) 18%, transparent);
    border-left: 3px solid var(--tone);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
  }

  .event:hover {
    background: color-mix(in srgb, var(--tone) 26%, transparent);
  }

  /* A bar cut off by an edge runs flat into it, so it doesn't read as a role
     that started or ended there. */
  .event.clip-start {
    margin-left: 0;
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    padding-left: 12px;
  }

  .event.clip-end {
    margin-right: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .event.selected {
    background: var(--tone);
    border-left-color: var(--tone);
    color: #fff;
  }

  .event-org {
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-role {
    font-size: 11px;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event.selected .event-role {
    color: rgba(255, 255, 255, 0.85);
  }

  .event:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  /* A stretch of months with nothing in it. */
  .quiet {
    grid-column: 1 / -1;
    grid-row: 1;
    margin: 4px 0;
    font-size: 12px;
    color: var(--text-dim);
    text-align: center;
  }

  .now {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--cal-today);
    pointer-events: none;
  }

  .now::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--cal-today);
  }

  /* ---- the selected role ---- */
  .detail {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 20px 22px;
  }

  .detail-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: 0 0 auto;
  }

  .detail h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .detail-role {
    margin: 4px 0 0 18px;
    font-size: 13px;
  }

  .detail-when {
    margin: 2px 0 0 18px;
    font-size: 12px;
    color: var(--text-dim);
  }

  .detail-note {
    margin-left: 2px;
  }

  .highlights {
    margin: 12px 0 0;
    padding-left: 34px;
  }

  .highlights li {
    margin: 0 0 7px;
    font-size: 12.5px;
    line-height: 1.5;
  }

  .highlights li::marker {
    color: var(--text-dim);
  }

  /* ---- empty ---- */
  .empty {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--text-dim);
  }

  .empty-title {
    margin: 0;
    font-size: 14px;
    color: var(--text);
  }

  .empty-sub {
    margin: 0;
    font-size: 12px;
  }

  /* ---- phone ---- */
  .cal.compact .months,
  .cal.compact .rows {
    grid-template-columns: repeat(var(--cols), minmax(40px, 1fr));
  }

  .cal.compact .event-role {
    display: none;
  }

  /* Narrow months can't hold "Jan 2026" without colliding with February, and
     the bar above already names the span. */
  .cal.compact .month em {
    display: none;
  }

  /* The dock covers the bottom of the screen on a phone. */
  .cal.compact .detail {
    padding-bottom: 84px;
  }
</style>
