<script lang="ts">
  import Icon from '../Icon.svelte';
  import { formatDate } from '../../../lib/os/format';

  type Props = {
    title: string;
    oneLiner: string;
    stack: string[];
    status: string;
    created: string;
    imageUrls: string[];
    bodyHtml: string;
    repo?: string | null;
    demo?: string | null;
    thumbUrl?: string | null;
  };

  let {
    title,
    oneLiner,
    stack,
    status,
    created,
    imageUrls,
    bodyHtml,
    repo = null,
    demo = null,
    thumbUrl = null,
  }: Props = $props();

  let index = $state(0);
  const count = $derived(imageUrls.length);

  function prev() {
    if (count <= 1) return;
    index = (index - 1 + count) % count;
  }
  function next() {
    if (count <= 1) return;
    index = (index + 1) % count;
  }
</script>

<div class="project">
  <header class="header">
    <span class="app-icon">
      <Icon kind="app" size={40} thumb={thumbUrl} />
    </span>
    <div class="titles">
      <h1 class="title">{title}</h1>
      <p class="one-liner">{oneLiner}</p>
    </div>
    {#if repo || demo}
      <nav class="links" aria-label="Project links">
        {#if repo}
          <a class="link-btn" href={repo} target="_blank" rel="noopener">Repo ↗</a>
        {/if}
        {#if demo}
          <a class="link-btn" href={demo} target="_blank" rel="noopener">Demo ↗</a>
        {/if}
      </nav>
    {/if}
  </header>

  <div class="body">
    <div class="media">
      {#if count > 0}
        <img
          class="shot"
          src={imageUrls[index]}
          alt={`${title} screenshot ${index + 1}`}
        />
        {#if count > 1}
          <button
            class="arrow left"
            type="button"
            aria-label="Previous image"
            onclick={prev}>‹</button>
          <button
            class="arrow right"
            type="button"
            aria-label="Next image"
            onclick={next}>›</button>
          <div class="dots" role="tablist" aria-label="Image">
            {#each imageUrls as _, i (i)}
              <button
                class="dot"
                class:active={i === index}
                type="button"
                aria-label={`Image ${i + 1}`}
                aria-selected={i === index}
                role="tab"
                onclick={() => (index = i)}></button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <aside class="sidebar">
      <dl class="meta">
        <div class="meta-row">
          <dt>Stack</dt>
          <dd>{stack.join(', ')}</dd>
        </div>
        <div class="meta-row">
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
        <div class="meta-row">
          <dt>Created</dt>
          <dd>{formatDate(created)}</dd>
        </div>
      </dl>

      <div class="case-study">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html bodyHtml}
      </div>
    </aside>
  </div>
</div>

<style>
  .project {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg);
    font-family: var(--chrome-font);
  }

  /* ---- header ---- */
  .header {
    flex: 0 0 56px;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    background: var(--win-bg);
    border-bottom: 0.5px solid var(--hairline);
  }

  .app-icon {
    flex: 0 0 auto;
    display: flex;
  }

  .titles {
    flex: 1 1 auto;
    min-width: 0;
  }

  .title {
    font-family: var(--pixel-font);
    font-size: 16px;
    font-weight: normal;
    color: var(--text);
    margin: 0;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .one-liner {
    font-size: 12px;
    color: var(--text-dim);
    margin: 2px 0 0;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .links {
    flex: 0 0 auto;
    display: flex;
    gap: 6px;
  }

  .link-btn {
    font-size: 11px;
    line-height: 1;
    padding: 5px 8px;
    border: 0.5px solid var(--hairline);
    border-radius: 4px;
    color: var(--text);
    text-decoration: none;
    white-space: nowrap;
    transition:
      border-color 100ms ease,
      color 100ms ease;
  }

  .link-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  /* ---- body: two panes ---- */
  .body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
  }

  /* ---- left: media ---- */
  .media {
    flex: 0 0 60%;
    position: relative;
    min-width: 0;
    background: #1c1c1e;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .shot {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }

  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    font-size: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 100ms ease;
  }

  .arrow:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .arrow.left {
    left: 12px;
  }
  .arrow.right {
    right: 12px;
  }

  .dots {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transition: background 100ms ease;
  }

  .dot.active {
    background: #fff;
  }

  /* ---- right: sidebar ---- */
  .sidebar {
    flex: 0 0 40%;
    min-width: 0;
    overflow-y: auto;
    padding: 20px 24px;
    background: var(--win-bg);
  }

  .meta {
    margin: 0 0 16px;
    padding: 0 0 16px;
    border-bottom: 0.5px solid var(--hairline);
  }

  .meta-row {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  .meta-row + .meta-row {
    margin-top: 8px;
  }

  .meta dt {
    flex: 0 0 64px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .meta dd {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 13px;
    color: var(--text);
    margin: 0;
    line-height: 1.4;
  }

  /* ---- case study (injected HTML) ---- */
  .case-study {
    font-family: var(--serif-font);
    font-size: 15.5px;
    line-height: 1.65;
    color: var(--text);
    max-width: 62ch;
  }

  .case-study :global(h2) {
    font-family: var(--chrome-font);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    margin: 28px 0 0;
  }

  .case-study :global(p) {
    margin: 0.8em 0;
  }

  .case-study :global(a) {
    color: var(--accent);
    text-decoration: none;
  }

  .case-study :global(a:hover) {
    text-decoration: underline;
  }
</style>
