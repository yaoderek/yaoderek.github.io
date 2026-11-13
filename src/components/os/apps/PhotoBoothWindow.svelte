<script lang="ts">
  import { onMount } from 'svelte';
  import {
    EFFECTS,
    applyEffect,
    photoBoothName,
    type EffectId,
  } from '../../../lib/os/photobooth';

  type Props = {
    /** Phone layout: the booth fills the sheet. */
    compact?: boolean;
    reducedMotion?: boolean;
  };

  let { compact = false, reducedMotion = false }: Props = $props();

  type Shot = { url: string; name: string };

  // Effects run on raw pixels, so the live view and the effect grid render at
  // a modest size; only the shutter renders at the camera's full resolution.
  const PREVIEW_W = 720;
  const TILE_W = 220;

  let status = $state<'starting' | 'live' | 'denied' | 'unavailable'>('starting');
  let effect = $state<EffectId>('normal');
  // The 3×3 grid of every effect, live, the way Photo Booth picks one.
  let picking = $state(false);
  let shots = $state<Shot[]>([]);
  // A picture from the strip, shown in place of the camera.
  let viewing = $state<Shot | null>(null);
  let countdown = $state<number | null>(null);
  let flashing = $state(false);

  let video: HTMLVideoElement;
  let preview = $state<HTMLCanvasElement | null>(null);
  let tiles = $state<(HTMLCanvasElement | null)[]>([]);
  let stream: MediaStream | null = null;
  let frame = 0;
  let destroyed = false;
  // A tiny copy of the frame, scaled back up for Glow's blur.
  let glowCanvas: HTMLCanvasElement | null = null;

  async function start() {
    status = 'starting';
    if (!navigator.mediaDevices?.getUserMedia) {
      status = 'unavailable';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      status = (err as DOMException)?.name === 'NotAllowedError' ? 'denied' : 'unavailable';
      return;
    }
    // Closed while the browser was still asking for the camera.
    if (destroyed) return stop();
    video.srcObject = stream;
    await video.play().catch(() => {});
    status = 'live';
    cancelAnimationFrame(frame);
    loop();
  }

  function stop() {
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function loop() {
    frame = requestAnimationFrame(loop);
    if (video.readyState < 2) return;
    if (picking) {
      tiles.forEach((canvas, i) => canvas && draw(canvas, EFFECTS[i].id, TILE_W));
    } else if (!viewing && preview) {
      draw(preview, effect, PREVIEW_W);
    }
  }

  /** One mirrored frame of the camera into `canvas`, `width` wide, with `fx`. */
  function draw(canvas: HTMLCanvasElement, fx: EffectId, width: number) {
    const { videoWidth: vw, videoHeight: vh } = video;
    if (!vw || !vh) return;
    const w = Math.round(width);
    const h = Math.round((width * vh) / vw);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Mirrored, like looking in a mirror, which is how Photo Booth shows you
    // and how it saves you.
    ctx.setTransform(-1, 0, 0, 1, w, 0);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (fx === 'glow') {
      glowCanvas ??= document.createElement('canvas');
      glowCanvas.width = Math.max(1, Math.round(w / 14));
      glowCanvas.height = Math.max(1, Math.round(h / 14));
      glowCanvas.getContext('2d')?.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.8;
      ctx.drawImage(glowCanvas, 0, 0, w, h);
      ctx.restore();
    } else if (fx !== 'normal') {
      const pixels = ctx.getImageData(0, 0, w, h);
      applyEffect(fx, pixels.data, w, h);
      ctx.putImageData(pixels, 0, 0);
    }
  }

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Count down 3, 2, 1, flash, and add the picture to the strip. */
  async function shoot() {
    if (status !== 'live' || countdown !== null) return;
    viewing = null;
    picking = false;
    for (const n of [3, 2, 1]) {
      countdown = n;
      await wait(800);
      if (destroyed) return;
    }
    countdown = null;
    if (!reducedMotion) {
      flashing = true;
      setTimeout(() => (flashing = false), 400);
    }

    const canvas = document.createElement('canvas');
    draw(canvas, effect, video.videoWidth);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    );
    if (!blob || destroyed) return;
    const name = photoBoothName(new Date(), shots.map((shot) => shot.name));
    shots = [...shots, { url: URL.createObjectURL(blob), name }];
  }

  function remove(shot: Shot) {
    URL.revokeObjectURL(shot.url);
    shots = shots.filter((s) => s !== shot);
    viewing = null;
  }

  onMount(() => {
    start();
    return () => {
      destroyed = true;
      stop();
      shots.forEach((shot) => URL.revokeObjectURL(shot.url));
    };
  });
</script>

<div class="booth" class:compact>
  <div class="stage">
    <!-- The camera feed itself; what's on screen is the canvas it's drawn to. -->
    <video bind:this={video} class="source" playsinline muted aria-hidden="true"></video>

    {#if status === 'live'}
      {#if viewing}
        <img class="shot" src={viewing.url} alt={viewing.name} />
      {:else if picking}
        <div class="grid" role="listbox" aria-label="Effects">
          {#each EFFECTS as fx, i (fx.id)}
            <button
              class="tile"
              class:current={fx.id === effect}
              role="option"
              aria-selected={fx.id === effect}
              onclick={() => {
                effect = fx.id;
                picking = false;
              }}
            >
              <canvas bind:this={tiles[i]}></canvas>
              <span>{fx.name}</span>
            </button>
          {/each}
        </div>
      {:else}
        <canvas class="live" bind:this={preview} aria-label="Camera"></canvas>
      {/if}

      {#if countdown !== null}
        <div class="count" aria-live="assertive">{countdown}</div>
      {/if}
    {:else}
      <div class="message" aria-live="polite">
        {#if status === 'starting'}
          <p>Starting the camera…</p>
        {:else if status === 'denied'}
          <p>Photo Booth needs your camera.</p>
          <p class="dim">
            Allow camera access for this site in your browser, then try again. Pictures
            stay on your device.
          </p>
          <button class="tool" onclick={start}>Try Again</button>
        {:else}
          <p>No camera available.</p>
          <p class="dim">Photo Booth needs a camera, and a browser that lets sites use it.</p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="toolbar">
    <div class="side">
      {#if viewing}
        <a class="tool" href={viewing.url} download={viewing.name}>Download</a>
        <button class="tool" onclick={() => viewing && remove(viewing)}>Delete</button>
      {/if}
    </div>
    <button
      class="shutter"
      aria-label="Take Photo"
      title="Take Photo"
      disabled={status !== 'live' || countdown !== null}
      onclick={shoot}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 4.5h6l1.4 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h2.6z"
          fill="currentColor"
        />
        <circle cx="12" cy="12.6" r="3.6" fill="#d92d2d" />
      </svg>
    </button>
    <div class="side end">
      <button
        class="tool"
        class:on={picking}
        aria-pressed={picking}
        disabled={status !== 'live'}
        onclick={() => {
          picking = !picking;
          viewing = null;
        }}>Effects</button
      >
    </div>
  </div>

  {#if shots.length > 0}
    <div class="strip" role="list" aria-label="Pictures taken">
      {#each shots as shot (shot.url)}
        <div role="listitem">
          <button
            class="thumb"
            class:selected={viewing === shot}
            aria-label={shot.name}
            onclick={() => {
              viewing = viewing === shot ? null : shot;
              picking = false;
            }}
          >
            <img src={shot.url} alt="" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if flashing}
  <div class="flash" aria-hidden="true"></div>
{/if}

<style>
  /* Photo Booth is dark whatever the system appearance. */
  .booth {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1c1c1e;
    color: #e5e5ea;
    font-size: 13px;
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #000;
  }

  .source {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .live,
  .shot {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .live {
    width: 100%;
    height: 100%;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 14px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 0;
    border-radius: 6px;
    color: #d1d1d6;
    font-size: 11px;
  }

  .tile canvas {
    width: 100%;
    min-height: 0;
    flex: 1;
    object-fit: contain;
    border-radius: 4px;
    outline: 2px solid transparent;
  }

  .tile.current canvas,
  .tile:hover canvas {
    outline-color: #0a84ff;
  }

  .count {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 120px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }

  .message {
    max-width: 320px;
    text-align: center;
    line-height: 1.5;
  }

  .message p {
    margin: 0 0 8px;
  }

  .dim {
    color: #98989d;
  }

  .toolbar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: linear-gradient(#3a3a3c, #2c2c2e);
    border-top: 1px solid #000;
  }

  .side {
    display: flex;
    gap: 8px;
  }

  .side.end {
    justify-content: flex-end;
  }

  .tool {
    padding: 4px 12px;
    border-radius: 6px;
    background: #48484a;
    color: #f2f2f7;
    font-size: 12px;
    text-decoration: none;
    box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.15);
  }

  .tool.on {
    background: #0a84ff;
  }

  .tool:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .shutter {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 34px;
    border-radius: 17px;
    background: linear-gradient(#ff5a4f, #d92d2d);
    color: #fff;
    box-shadow:
      inset 0 0.5px 0 rgba(255, 255, 255, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .shutter svg {
    width: 24px;
    height: 24px;
  }

  .shutter:disabled {
    filter: grayscale(0.6) brightness(0.7);
    cursor: default;
  }

  .strip {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    overflow-x: auto;
    background: #232325;
    border-top: 1px solid #000;
  }

  .thumb {
    display: block;
    height: 56px;
    border-radius: 4px;
    overflow: hidden;
    outline: 2px solid transparent;
    outline-offset: 1px;
  }

  .thumb.selected {
    outline-color: #0a84ff;
  }

  .thumb img {
    display: block;
    height: 100%;
  }

  /* The screen flashes white as the picture is taken. */
  .flash {
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: #fff;
    pointer-events: none;
    animation: flash 400ms ease-out forwards;
  }

  @keyframes flash {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .compact .count {
    font-size: 88px;
  }
</style>
