<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '../../../lib/os/format';

  type Item = {
    title: string;
    imageUrl: string;
    created: string;
    medium: string;
    width: number;
    height: number;
  };

  type Props = {
    items: Item[];
    index?: number;
    active?: boolean;
  };

  let { items, index = 0, active = false }: Props = $props();

  // `index` seeds the starting image only; navigation is internal thereafter,
  // so capturing just the initial value here is intended.
  // svelte-ignore state_referenced_locally
  let current = $state(index);
  const count = $derived(items.length);
  const item = $derived(items[current]);

  function prev() {
    if (count <= 1) return;
    current = (current - 1 + count) % count;
  }
  function next() {
    if (count <= 1) return;
    current = (current + 1) % count;
  }

  // Preload the neighbouring images so cycling is instant. Read-only of
  // `current`/`items` — writes nothing reactive, so an effect is safe here.
  $effect(() => {
    if (count <= 1 || typeof Image === 'undefined') return;
    const n = (current + 1) % count;
    const p = (current - 1 + count) % count;
    new Image().src = items[n].imageUrl;
    new Image().src = items[p].imageUrl;
  });

  function onKeydown(e: KeyboardEvent) {
    if (!active) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="gallery">
  <div class="toolbar">
    <div class="info">
      <span class="name">{item.title}</span>
      <span class="sub">{formatDate(item.created)} · {item.medium}</span>
    </div>
    <div class="nav">
      <button
        class="arrow"
        type="button"
        aria-label="Previous image"
        onclick={prev}
        disabled={count <= 1}>‹</button>
      <span class="counter">{current + 1} of {count}</span>
      <button
        class="arrow"
        type="button"
        aria-label="Next image"
        onclick={next}
        disabled={count <= 1}>›</button>
    </div>
  </div>

  <div class="stage">
    <img class="shot" src={item.imageUrl} alt={item.title} />
  </div>
</div>

<style>
  .gallery {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg);
    font-family: var(--chrome-font);
  }

  .toolbar {
    flex: 0 0 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    background: var(--win-bg);
    border-bottom: 0.5px solid var(--hairline);
  }

  .info {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    flex: 0 0 auto;
    font-size: 11px;
    color: var(--text-dim);
    white-space: nowrap;
  }

  .nav {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .arrow {
    font-size: 16px;
    line-height: 1;
    color: var(--text);
    padding: 2px 4px;
    transition: color 100ms ease;
  }

  .arrow:hover:not(:disabled) {
    color: var(--accent);
  }

  .arrow:disabled {
    color: var(--text-dim);
    opacity: 0.4;
    cursor: default;
  }

  .counter {
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .stage {
    flex: 1 1 auto;
    min-height: 0;
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
</style>
