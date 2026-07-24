<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '../../../lib/os/format';
  import type { PhotoAlbum } from '../../../lib/os/photos';

  type Props = {
    albums: PhotoAlbum[];
    /** Album to open. null opens the album list. */
    album?: string | null;
    /** Picture within that album. null opens the album's grid. */
    index?: number | null;
    active?: boolean;
    reducedMotion?: boolean;
    /** Phone layout: no filmstrip (the dock covers it), arrows always shown. */
    compact?: boolean;
  };

  let {
    albums,
    album = null,
    index = null,
    active = false,
    reducedMotion = false,
    compact = false,
  }: Props = $props();

  function albumExists(id: string | null): boolean {
    return id !== null && albums.some((a) => a.id === id);
  }

  // `album`/`index` seed the opening state; the effect below re-targets the view
  // when the window manager points an already-open Photos window somewhere else.
  // svelte-ignore state_referenced_locally
  let openAlbum = $state(albumExists(album) ? album : null);
  // svelte-ignore state_referenced_locally
  let view = $state<'albums' | 'grid' | 'photo'>(
    openAlbum === null ? 'albums' : index === null ? 'grid' : 'photo'
  );
  // svelte-ignore state_referenced_locally
  let current = $state(index ?? 0);

  const shown = $derived(albums.find((a) => a.id === openAlbum) ?? null);
  const shownTitle = $derived(shown?.title ?? '');
  const items = $derived(shown?.items ?? []);
  const count = $derived(items.length);
  const item = $derived(items[Math.min(current, Math.max(count - 1, 0))]);

  // The props arrive through a spread, so this effect also re-runs whenever any
  // window state changes (a focus or a drag). Only a genuinely new target may
  // move the view, or clicking "back" would snap straight back to the photo.
  // svelte-ignore state_referenced_locally
  let lastTarget = `${album}:${index}`;

  $effect(() => {
    const target = `${album}:${index}`;
    if (target === lastTarget) return;
    lastTarget = target;

    if (!albumExists(album)) return;
    openAlbum = album;
    const opened = albums.find((a) => a.id === album);
    if (index === null || !opened || index < 0 || index >= opened.items.length) {
      view = 'grid';
      return;
    }
    current = index;
    view = 'photo';
  });

  function showAlbum(id: string) {
    openAlbum = id;
    current = 0;
    view = 'grid';
  }

  function show(i: number) {
    if (count === 0) return;
    current = Math.min(Math.max(i, 0), count - 1);
    view = 'photo';
  }

  function prev() {
    show(current - 1);
  }

  function next() {
    show(current + 1);
  }

  // Preload the neighbours so stepping through the strip is instant. Read-only
  // of `current`/`items`, so an effect is safe here.
  $effect(() => {
    if (count === 0 || typeof Image === 'undefined') return;
    for (const i of [current - 1, current + 1]) {
      if (i >= 0 && i < count) new Image().src = items[i].imageUrl;
    }
  });

  // Keep the selected frame centred in the scrubber.
  let strip = $state<HTMLElement | null>(null);

  $effect(() => {
    if (view !== 'photo' || compact || !strip) return;
    const frame = strip.querySelector<HTMLElement>(`[data-frame="${current}"]`);
    // scrollIntoView is absent in jsdom; guard so tests don't throw.
    if (!frame || typeof frame.scrollIntoView !== 'function') return;
    frame.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  });

  function onKeydown(e: KeyboardEvent) {
    if (!active || view !== 'photo') return;
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

  // Swipe between photos on touch.
  let swipeStartX = 0;

  function onPointerDown(e: PointerEvent) {
    swipeStartX = e.clientX;
  }

  function onPointerUp(e: PointerEvent) {
    const delta = e.clientX - swipeStartX;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next();
    else prev();
  }
</script>

<div class="photos" class:reduced={reducedMotion} class:compact>
  {#if albums.length === 0}
    <div class="empty">
      <p class="empty-title">Nothing in the library yet</p>
      <p class="empty-sub">Photos will show up here as they get added.</p>
    </div>
  {:else if view === 'albums' || shown === null}
    <header class="bar">
      <span class="bar-title">Albums</span>
      <span class="bar-count">{albums.length} albums</span>
    </header>

    <div class="shelf">
      {#each albums as entry (entry.id)}
        <button
          class="album"
          type="button"
          onclick={() => showAlbum(entry.id)}
          aria-label={`Open the ${entry.title} album`}
        >
          <span class="cover">
            <img
              src={entry.items[0].imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
          <span class="album-title">{entry.title}</span>
          <span class="album-count">{entry.items.length}</span>
        </button>
      {/each}
    </div>
  {:else if view === 'grid'}
    <header class="bar">
      <button class="back" type="button" onclick={() => (view = 'albums')}>
        <span class="chev" aria-hidden="true">‹</span>Albums
      </button>
      <span class="bar-title mid">{shownTitle}</span>
      <span class="bar-count">{count} {count === 1 ? 'photo' : 'photos'}</span>
    </header>

    <div class="grid">
      {#each items as photo, i (photo.imageUrl)}
        <button
          class="tile"
          type="button"
          onclick={() => show(i)}
          aria-label={`Open ${photo.title}`}
        >
          <img src={photo.imageUrl} alt={photo.title} loading="lazy" decoding="async" />
        </button>
      {/each}
    </div>
  {:else}
    <header class="bar">
      <button class="back" type="button" onclick={() => (view = 'grid')}>
        <span class="chev" aria-hidden="true">‹</span>{shownTitle}
      </button>
      <div class="stamp">
        <span class="stamp-date">{formatDate(item.created)}</span>
        <span class="stamp-title">{item.title}</span>
      </div>
      <span class="bar-count">{current + 1} of {count}</span>
    </header>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="stage" onpointerdown={onPointerDown} onpointerup={onPointerUp}>
      {#key current}
        <img class="shot" src={item.imageUrl} alt={item.title} />
      {/key}

      <button
        class="edge edge-prev"
        type="button"
        aria-label="Previous photo"
        onclick={prev}
        disabled={current === 0}>‹</button>
      <button
        class="edge edge-next"
        type="button"
        aria-label="Next photo"
        onclick={next}
        disabled={current === count - 1}>›</button>
    </div>

    {#if !compact}
      <div class="strip" bind:this={strip}>
        {#each items as photo, i (photo.imageUrl)}
          <button
            class="frame"
            class:on={i === current}
            type="button"
            data-frame={i}
            aria-label={photo.title}
            aria-current={i === current ? 'true' : undefined}
            onclick={() => show(i)}
          >
            <img src={photo.imageUrl} alt="" loading="lazy" decoding="async" />
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Chrome follows the system appearance (--win-bg and friends flip under
     .theme-dark); only the stage and its controls need their own pair. */
  .photos {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg);
    font-family: var(--chrome-font);
  }

  /* ---- shared bar ---- */
  .bar {
    flex: 0 0 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 12px;
    background: var(--win-bg);
    border-bottom: 0.5px solid var(--hairline);
  }

  .bar-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text);
  }

  /* Centred between the back button and the count, the way iOS titles sit. */
  .bar-title.mid {
    font-size: 13px;
    font-weight: 600;
  }

  .bar-count {
    flex: 0 0 auto;
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .back {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12.5px;
    color: var(--photo-link);
    white-space: nowrap;
  }

  .back .chev {
    font-size: 17px;
    line-height: 1;
    margin-top: -2px;
  }

  .back:hover {
    text-decoration: underline;
  }

  /* ---- album list ---- */
  .shelf {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    /* max-content, not auto: the covers size themselves off the column, and
       auto rows would divide the container's height up between them instead. */
    grid-auto-rows: max-content;
    align-content: start;
    gap: 20px 16px;
    padding: 18px 16px;
  }

  .album {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
    text-align: left;
  }

  .cover {
    display: block;
    overflow: hidden;
    border-radius: 8px;
    line-height: 0;
    background: var(--hover-dim);
    box-shadow: 0 0 0 0.5px var(--hairline);
  }

  /* Square crop taken from the image itself: a grid row won't size itself off
     an aspect-ratio on the box, so the picture has to carry it. */
  .cover img {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
  }

  .album:hover .cover img {
    opacity: 0.86;
  }

  .album:focus-visible .cover {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .album:focus-visible {
    outline: none;
  }

  .album-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
  }

  .album-count {
    margin-top: -4px;
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }

  /* ---- album grid ---- */
  .grid {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    grid-auto-rows: max-content;
    align-content: start;
    gap: 2px;
    padding: 2px;
    background: var(--win-bg);
  }

  .tile {
    position: relative;
    overflow: hidden;
    line-height: 0;
    background: var(--hover-dim);
  }

  .tile img {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
  }

  .tile:hover img {
    opacity: 0.86;
  }

  .tile:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  /* ---- photo view ---- */
  .stamp {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.25;
    text-align: center;
  }

  .stamp-date {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .stamp-title {
    max-width: 100%;
    font-size: 10.5px;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    background: var(--photo-stage);
    overflow: hidden;
    touch-action: pan-y;
  }

  .shot {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 2px;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.22);
  }

  @media (prefers-reduced-motion: no-preference) {
    .photos:not(.reduced) .shot {
      animation: photo-in 200ms ease-out;
    }
  }

  @keyframes photo-in {
    from {
      opacity: 0;
      transform: scale(0.99);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Edge arrows: quiet until the pointer is over the stage. */
  .edge {
    position: absolute;
    top: 50%;
    translate: 0 -50%;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    font-size: 18px;
    line-height: 1;
    color: var(--text);
    background: var(--photo-scrim);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .edge-prev {
    left: 10px;
  }
  .edge-next {
    right: 10px;
  }

  .stage:hover .edge:not(:disabled),
  .edge:focus-visible {
    opacity: 1;
  }

  /* No hover on a phone, so the arrows stay put. */
  .photos.compact .edge:not(:disabled) {
    opacity: 1;
  }

  .edge:hover:not(:disabled) {
    background: var(--photo-scrim-hover);
  }

  /* ---- filmstrip scrubber ---- */
  .strip {
    flex: 0 0 58px;
    height: 58px;
    display: flex;
    align-items: center;
    /* `safe` keeps the first frames reachable once the strip overflows. */
    justify-content: safe center;
    gap: 2px;
    padding: 0 12px;
    background: var(--win-bg);
    border-top: 0.5px solid var(--hairline);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  .strip::-webkit-scrollbar {
    display: none;
  }

  /* Frames sit shoulder to shoulder; the selected one lifts out of the strip. */
  .frame {
    flex: 0 0 auto;
    width: 30px;
    height: 38px;
    overflow: hidden;
    border-radius: 2px;
    opacity: 0.6;
    transition:
      width 140ms ease,
      height 140ms ease,
      opacity 140ms ease;
  }

  .photos.reduced .frame {
    transition: none;
  }

  .frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .frame:hover {
    opacity: 0.9;
  }

  .frame.on {
    width: 44px;
    height: 50px;
    opacity: 1;
    box-shadow:
      0 0 0 2px var(--photo-ring),
      0 2px 8px rgba(0, 0, 0, 0.35);
  }

  .frame:focus-visible {
    outline: 2px solid var(--photo-link);
    outline-offset: 1px;
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
