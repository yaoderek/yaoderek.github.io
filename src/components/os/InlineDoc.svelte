<script lang="ts">
  // Notes-app-style inline document view, rendered in the Finder's preview
  // pane so text files are readable without opening a window.
  import { formatDate } from '../../lib/os/format';

  type Props = {
    title: string;
    html: string;
    created?: string | null;
  };

  let { title, html, created = null }: Props = $props();
</script>

<article class="note" aria-label={title}>
  {#if created}
    <p class="date">{formatDate(created)}</p>
  {/if}
  <h1 class="title">{title}</h1>
  <div class="body">
    {@html html}
  </div>
</article>

<style>
  .note {
    height: 100%;
    overflow-y: auto;
    background: var(--paper);
    color: var(--paper-text);
    padding: 28px 36px 48px;
  }

  .date {
    text-align: center;
    font-size: 11px;
    color: var(--text-dim);
    margin: 0 0 18px;
  }

  .title {
    font-family: var(--chrome-font);
    font-size: 21px;
    font-weight: 700;
    margin: 0 auto 12px;
    max-width: 640px;
  }

  .body {
    font-family: var(--chrome-font);
    font-size: 15px;
    line-height: 1.6;
    max-width: 640px;
    margin: 0 auto;
  }

  .body :global(p) {
    margin: 0 0 0.85em;
  }

  .body :global(h2) {
    font-size: 16px;
    font-weight: 700;
    margin: 1.5em 0 0.5em;
  }

  /* Lists read as lists, not as prose: tighter and less indented than the
     browser default. */
  .body :global(ul),
  .body :global(ol) {
    margin: 0 0 1.1em;
    padding-left: 1.3em;
  }

  .body :global(li) {
    margin: 0.1em 0;
    line-height: 1.45;
  }

  .body :global(li::marker) {
    color: var(--text-dim);
  }

  .body :global(a) {
    color: var(--accent);
  }

  .body :global(dl.contact) {
    margin: 1.2em 0 0;
  }

  .body :global(dl.contact div) {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
  }

  .body :global(dl.contact dt) {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    width: 64px;
    flex-shrink: 0;
    line-height: 1.9;
  }

  .body :global(dl.contact dd) {
    margin: 0;
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
</style>
