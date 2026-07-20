<script lang="ts">
  import type { Win } from '../../lib/os/windows';
  import type { Snippet } from 'svelte';

  type Props = {
    win: Win;
    active: boolean;
    children: Snippet;
    onclose: () => void;
    onminimize: () => void;
    onfullscreen: () => void;
    onfocus: () => void;
    onmove: (x: number, y: number) => void;
    onmounted?: (el: HTMLElement) => void;
    onunmounted?: () => void;
  };

  let {
    win,
    active,
    children,
    onclose,
    onminimize,
    onfullscreen,
    onfocus,
    onmove,
    onmounted,
    onunmounted,
  }: Props = $props();

  // Action: focus the window root on mount (brings keyboard focus into the window),
  // and call register/unregister so Desktop can track DOM elements for focus return.
  function windowMount(node: HTMLElement) {
    node.focus();
    onmounted?.(node);
    return {
      destroy() {
        onunmounted?.();
      },
    };
  }

  // Drag state
  let dragging = $state(false);
  let dx = 0; // pointer offset from window x
  let dy = 0; // pointer offset from window y

  function onTitlePointerDown(e: PointerEvent) {
    if (win.fullscreen) return;
    // Don't start a drag from a button (traffic lights)
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true;
    dx = e.clientX - win.x;
    dy = e.clientY - win.y;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onTitlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    const nx = e.clientX - dx;
    // Clamp so the title bar can't slide under the 24px menu bar.
    const ny = Math.max(24, e.clientY - dy);
    onmove(nx, ny);
  }

  function onTitlePointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  // onpointerdown anywhere focuses the window (before drag logic on the bar).
  function onWindowPointerDown() {
    onfocus();
  }
</script>

{#if !win.minimized}
  <!-- Use div (no implicit role) so role="dialog" can be applied freely without
       a Svelte a11y warning. Dialog is an interactive ARIA landmark; this also
       legitimately resolves any a11y_no_static_element_interactions warning. -->
  <div
    class="window"
    class:active
    class:fullscreen={win.fullscreen}
    style:left={win.fullscreen ? undefined : `${win.x}px`}
    style:top={win.fullscreen ? undefined : `${win.y}px`}
    style:width={win.fullscreen ? undefined : `${win.w}px`}
    style:height={win.fullscreen ? undefined : `${win.h}px`}
    style:z-index={win.z}
    role="dialog"
    aria-label={win.title}
    tabindex="-1"
    onpointerdown={onWindowPointerDown}
    use:windowMount
  >
    <!-- role="group" on the drag-handle header gives it an interactive role,
         resolving a11y_no_static_element_interactions on the header element. -->
    <header
      class="titlebar"
      role="group"
      aria-label="Window controls"
      onpointerdown={onTitlePointerDown}
      onpointermove={onTitlePointerMove}
      onpointerup={onTitlePointerUp}
      onpointercancel={onTitlePointerUp}
      ondblclick={() => onfullscreen()}
    >
      <div class="lights">
        <button
          class="light close"
          aria-label="Close"
          title="Close"
          onclick={(e) => {
            e.stopPropagation();
            onclose();
          }}><span class="glyph">×</span></button>
        <button
          class="light min"
          aria-label="Minimize"
          title="Minimize"
          onclick={(e) => {
            e.stopPropagation();
            onminimize();
          }}><span class="glyph">−</span></button>
        <button
          class="light zoom"
          aria-label="Enter full screen"
          title="Enter full screen"
          onclick={(e) => {
            e.stopPropagation();
            onfullscreen();
          }}><span class="glyph">⤢</span></button>
      </div>
      <div class="title">{win.title}</div>
    </header>

    <div class="body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .window {
    position: absolute;
    display: flex;
    flex-direction: column;
    background: var(--win-bg);
    border-radius: var(--radius-win);
    border: 0.5px solid var(--win-border);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    overflow: hidden;
    /* Windows receive programmatic focus for Esc handling — suppress visible outline
       on the window root itself (focus is not keyboard-initiated here). */
    outline: none;
  }

  .window.active {
    box-shadow: var(--shadow-win);
  }

  .window.fullscreen {
    position: fixed;
    top: 24px;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    height: auto;
    border-radius: 0;
    border-width: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .window {
      animation: window-open 140ms ease-out;
    }
  }

  @keyframes window-open {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .titlebar {
    position: relative;
    flex: 0 0 var(--titlebar-h);
    height: var(--titlebar-h);
    display: flex;
    align-items: center;
    padding: 0 10px;
    border-bottom: 0.5px solid var(--hairline);
    background: rgba(255, 255, 255, 0.4);
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .lights {
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1;
  }

  .light {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0.5px solid rgba(0, 0, 0, 0.12);
    line-height: 0;
  }

  .light.close {
    background: #ff5f57;
  }
  .light.min {
    background: #febc2e;
  }
  .light.zoom {
    background: #28c840;
  }

  .glyph {
    font-size: 8px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.55);
    opacity: 0;
    line-height: 1;
    transition: opacity 80ms ease;
  }

  .lights:hover .glyph {
    opacity: 1;
  }

  .title {
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
    font-family: var(--pixel-font);
    font-size: 13px;
    color: var(--text);
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 72px;
  }

  .window:not(.active) .title {
    opacity: 0.55;
  }

  .body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
</style>
