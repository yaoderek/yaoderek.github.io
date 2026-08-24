<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '../../../lib/os/format';
  import { noteOrFirst } from '../../../lib/os/notes';
  import type { NoteItem } from '../../../lib/os/types';

  type Props = {
    notes: NoteItem[];
    /** The note to show. null falls back to the first one in the list. */
    noteId?: string | null;
    active?: boolean;
    /** Told whenever the reader picks a different note, so the URL can follow. */
    onselect?: ((note: NoteItem) => void) | null;
    /** Phone layout: the list lives in the Files view, so show the note alone. */
    compact?: boolean;
  };

  let {
    notes,
    noteId = null,
    active = false,
    onselect = null,
    compact = false,
  }: Props = $props();

  // `noteId` seeds the opening note; the effect below re-targets an already-open
  // window when the Finder or the dock points it at something else.
  // svelte-ignore state_referenced_locally
  let currentId = $state(noteOrFirst(notes, noteId)?.id ?? null);

  let query = $state('');

  const matches = $derived(filterNotes(notes, query));
  const pinned = $derived(matches.filter((note) => note.pinned));
  const rest = $derived(matches.filter((note) => !note.pinned));
  const shown = $derived(noteOrFirst(notes, currentId));

  // The props arrive through a spread, so this effect re-runs on any window
  // change (a focus, a drag). Only a genuinely new target may move the
  // selection, or clicking a note would snap straight back to the old one.
  // svelte-ignore state_referenced_locally
  let lastTarget = noteId;

  $effect(() => {
    if (noteId === lastTarget) return;
    lastTarget = noteId;
    const target = noteOrFirst(notes, noteId);
    if (target) currentId = target.id;
  });

  function filterNotes(all: NoteItem[], q: string): NoteItem[] {
    const needle = q.trim().toLowerCase();
    if (needle === '') return all;
    return all.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) ||
        note.snippet.toLowerCase().includes(needle)
    );
  }

  function select(note: NoteItem) {
    currentId = note.id;
    // Keep the re-target guard in step, so the window manager echoing this
    // selection back as a prop doesn't count as a new target.
    lastTarget = note.id;
    onselect?.(note);
  }

  /** Arrow keys walk the visible list, the way they do in Notes. */
  function step(delta: number) {
    if (matches.length === 0) return;
    const at = matches.findIndex((note) => note.id === currentId);
    const next = matches[Math.min(Math.max(at + delta, 0), matches.length - 1)];
    if (next && next.id !== currentId) select(next);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active || compact) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.isContentEditable) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      step(-1);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="notes" class:compact>
  {#if !compact}
    <aside class="list" aria-label="Notes">
      <div class="list-bar">
        <label class="search">
          <svg
            class="glass"
            viewBox="0 0 16 16"
            width="11"
            height="11"
            aria-hidden="true"
          >
            <circle
              cx="7"
              cy="7"
              r="4.6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            />
            <line
              x1="10.4"
              y1="10.4"
              x2="14"
              y2="14"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
          <input
            type="search"
            placeholder="Search"
            bind:value={query}
            aria-label="Search notes"
          />
        </label>
      </div>

      <div class="rows">
        {#if matches.length === 0}
          <p class="no-hits">No notes found</p>
        {/if}

        {#if pinned.length > 0}
          <p class="group">Pinned</p>
          {#each pinned as note (note.id)}
            {@render row(note)}
          {/each}
        {/if}

        {#if rest.length > 0}
          {#if pinned.length > 0}
            <p class="group">Notes</p>
          {/if}
          {#each rest as note (note.id)}
            {@render row(note)}
          {/each}
        {/if}
      </div>
    </aside>
  {/if}

  <section class="page-wrap">
    {#if shown === null}
      <div class="empty">
        <p class="empty-title">No note selected</p>
        <p class="empty-sub">Pick something from the list to start reading.</p>
      </div>
    {:else}
      <div class="scroll">
        <article class="page">
          <p class="stamp">{formatDate(shown.created)}</p>
          <h1 class="note-title">{shown.title}</h1>
          <div class="body">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html shown.html}
          </div>
        </article>
      </div>
    {/if}
  </section>
</div>

{#snippet row(note: NoteItem)}
  <button
    class="row"
    class:on={note.id === currentId}
    class:idle={!active}
    type="button"
    onclick={() => select(note)}
    aria-current={note.id === currentId ? 'true' : undefined}
  >
    <span class="row-title">{note.title}</span>
    <span class="row-sub">
      <span class="row-date">{formatDate(note.created)}</span>
      <span class="row-snip">{note.snippet}</span>
    </span>
  </button>
{/snippet}

<style>
  .notes {
    display: flex;
    height: 100%;
    background: var(--paper);
    font-family: var(--chrome-font);
  }

  /* ---- note list ---- */
  .list {
    flex: 0 0 248px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--note-list-bg);
    border-right: 0.5px solid var(--hairline);
  }

  .list-bar {
    flex: 0 0 auto;
    padding: 8px 10px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--note-field);
  }

  .glass {
    flex: 0 0 auto;
    color: var(--text-dim);
    display: block;
  }

  .search input {
    flex: 1 1 auto;
    min-width: 0;
    border: none;
    outline: none;
    background: none;
    font-family: inherit;
    font-size: 12px;
    color: var(--text);
  }

  /* Safari draws its own clear button on search inputs; ours is quieter. */
  .search input::-webkit-search-decoration,
  .search input::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  .rows {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 6px 8px;
  }

  .group {
    margin: 6px 6px 2px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text);
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    padding: 7px 9px;
    border-radius: 6px;
    text-align: left;
    min-width: 0;
  }

  .row:hover:not(.on) {
    background: var(--hover-dim);
  }

  /* Notes tints the selected row yellow, and greys it while the window is in
     the background. */
  .row.on {
    background: var(--note-sel);
  }

  .row.on.idle {
    background: var(--note-sel-idle);
  }

  .row:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .row-title,
  .row-snip,
  .row-date {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
  }

  .row-sub {
    display: flex;
    gap: 6px;
    min-width: 0;
    font-size: 11px;
    color: var(--text-dim);
  }

  .row-date {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
  }

  .row-snip {
    flex: 1 1 auto;
    min-width: 0;
  }

  .no-hits {
    margin: 14px 8px;
    font-size: 11.5px;
    color: var(--text-dim);
    text-align: center;
  }

  /* ---- the note itself ---- */
  .page-wrap {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--paper);
  }

  .scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .page {
    max-width: 62ch;
    margin: 0 auto;
    padding: 14px 34px 44px;
    color: var(--paper-text);
  }

  /* Notes centres a small grey timestamp above the note. */
  .stamp {
    margin: 0 0 12px;
    font-size: 10.5px;
    color: var(--text-dim);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .note-title {
    margin: 0 0 10px;
    font-size: 21px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .body {
    font-size: 14.5px;
    line-height: 1.55;
  }

  .body :global(p) {
    margin: 0.75em 0;
  }

  .body :global(h2) {
    font-size: 16px;
    font-weight: 700;
    margin: 1.5em 0 0.2em;
    line-height: 1.3;
  }

  .body :global(ul),
  .body :global(ol) {
    margin: 0.4em 0 1em;
    padding-left: 1.3em;
  }

  .body :global(li) {
    margin: 0.15em 0;
  }

  .body :global(li::marker) {
    color: var(--note-accent);
  }

  .body :global(a) {
    color: var(--accent);
    text-decoration: none;
  }

  .body :global(a:hover) {
    text-decoration: underline;
  }

  /* Project screenshots, sitting in the note the way an attachment does. */
  .body :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 4px 0;
    border-radius: 8px;
    box-shadow: 0 0 0 0.5px var(--hairline);
  }

  /* The README's contact block and a project's facts: one label/value pair per
     row, matching how the Finder previews the same note. */
  .body :global(dl.contact) {
    margin: 1.1em 0;
  }

  .body :global(dl.contact div) {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
  }

  .body :global(dl.contact dt) {
    flex: 0 0 64px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    line-height: 1.9;
  }

  .body :global(dl.contact dd) {
    margin: 0;
    min-width: 0;
  }

  /* ---- phone ---- */
  /* The dock floats over the bottom of the screen, so the last lines need
     room to clear it. */
  .notes.compact .page {
    padding: 12px 18px 84px;
  }

  /* ---- empty state ---- */
  .empty {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 24px;
    text-align: center;
  }

  .empty-title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .empty-sub {
    margin: 0;
    font-size: 11.5px;
    color: var(--text-dim);
  }
</style>
