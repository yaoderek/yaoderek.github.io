<script lang="ts">
  import { formatDate } from '../../../lib/os/format';

  type Props = {
    title: string;
    html: string;
    created?: string | null;
  };

  let { title, html, created = null }: Props = $props();
</script>

<div class="doc">
  <div class="ruler" aria-hidden="true"></div>
  <div class="scroll">
    <article class="page">
      <h1 class="title">{title}</h1>
      {#if created}
        <p class="date">{formatDate(created)}</p>
      {/if}
      <div class="content">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html html}
      </div>
    </article>
  </div>
</div>

<style>
  .doc {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
  }

  .ruler {
    flex: 0 0 18px;
    height: 18px;
    background: var(--win-bg);
    border-bottom: 0.5px solid var(--hairline);
    background-image: repeating-linear-gradient(
      to right,
      transparent 0,
      transparent 23px,
      rgba(0, 0, 0, 0.12) 23px,
      rgba(0, 0, 0, 0.12) 24px
    );
    background-position: 12px center;
    background-repeat: repeat-x;
    background-size: 24px 6px;
  }

  .scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    background: #fff;
  }

  .page {
    max-width: 65ch;
    margin: 0 auto;
    padding: 36px 40px;
  }

  .title {
    font-family: var(--serif-font);
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
    line-height: 1.25;
  }

  .date {
    font-family: var(--chrome-font);
    font-size: 12px;
    color: var(--text-dim);
    margin: 6px 0 0;
  }

  .content {
    font-family: var(--serif-font);
    font-size: 17px;
    line-height: 1.65;
    color: var(--text);
    margin-top: 20px;
  }

  .content :global(p) {
    margin: 0.9em 0;
  }

  .content :global(h2) {
    font-family: var(--serif-font);
    font-size: 18px;
    font-weight: 600;
    margin: 1.6em 0 0;
    line-height: 1.3;
  }

  .content :global(a) {
    color: var(--accent);
    text-decoration: none;
  }

  .content :global(a:hover) {
    text-decoration: underline;
  }

  /* README contact block */
  .content :global(dl) {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 16px;
    margin: 1.2em 0;
  }

  .content :global(dt) {
    font-family: var(--chrome-font);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-dim);
    align-self: baseline;
    line-height: 1.5;
  }

  .content :global(dd) {
    font-size: 15px;
    margin: 0 0 10px;
    line-height: 1.5;
  }
</style>
