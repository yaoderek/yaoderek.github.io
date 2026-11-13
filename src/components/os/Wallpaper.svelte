<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { wallpaperFrame } from '../../lib/os/wallpaper';

  type Props = {
    /** One optimized URL per frame of the dynamic wallpaper, in frame order. */
    frames: string[];
    reducedMotion?: boolean;
  };

  let { frames, reducedMotion = false }: Props = $props();

  // The first frame fades up from the desktop's fallback colour; a change of
  // light later on dissolves slowly, the way macOS moves between frames.
  const FIRST_FADE_MS = 500;
  const CHANGE_FADE_MS = 2500;
  // The sun moves a frame's worth in tens of minutes, so once a minute is plenty.
  const CHECK_MS = 60_000;

  // Every layer stays stacked until the newest has finished fading in over it.
  let layers = $state<{ url: string; fadeMs: number }[]>([]);

  function show(url: string | undefined) {
    if (!url || layers.at(-1)?.url === url) return;
    // Decode before swapping so a frame never fades in half-loaded.
    const img = new Image();
    img.onload = () => {
      const fadeMs = reducedMotion ? 0 : layers.length === 0 ? FIRST_FADE_MS : CHANGE_FADE_MS;
      layers = [...layers, { url, fadeMs }];
      setTimeout(() => (layers = layers.slice(-1)), fadeMs + 100);
    };
    img.src = url;
  }

  const update = () => show(frames[wallpaperFrame(new Date())]);

  onMount(() => {
    update();
    const timer = setInterval(update, CHECK_MS);
    // A background tab can sleep through a frame change; catch up on return.
    const onVisible = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });
</script>

<div class="wallpaper" aria-hidden="true">
  {#each layers as layer (layer.url)}
    <div
      class="layer"
      style:background-image={`url(${layer.url})`}
      in:fade={{ duration: layer.fadeMs }}
    ></div>
  {/each}
</div>

<style>
  .wallpaper {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .layer {
    position: absolute;
    inset: 0;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }
</style>
