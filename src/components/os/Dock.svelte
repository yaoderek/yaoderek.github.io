<script lang="ts">
  import { magnify } from '../../lib/os/dock';
  import type { Win } from '../../lib/os/windows';
  import { onDestroy } from 'svelte';

  type DockItem = {
    id: string;
    label: string;
    iconUrl?: string;
    // True when the app has a window open — draws the dot under the icon.
    running?: boolean;
    action: () => void;
  };

  type Props = {
    items: DockItem[];
    trailing?: DockItem[];
    // App id → real icon URL, for minimized-window icons.
    appIcons?: Record<string, string>;
    minimized: Win[];
    onrestore: (id: number) => void;
    reducedMotion: boolean;
    isMobile?: boolean;
  };

  let {
    items,
    trailing = [],
    appIcons = {},
    minimized,
    onrestore,
    reducedMotion,
    isMobile = false,
  }: Props = $props();

  // Touch device detection — always visible, no magnification
  const isTouch =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: none)').matches
      : false;

  // Auto-hide state
  let visible = $state(isTouch);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // Fix 1: clear pending hide timer on destroy to avoid leak
  onDestroy(() => {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  });

  // Per-icon scale (keyed by index across all sections)
  // sections: items + minimized + trailing
  // Fix 3: derive count reactively so new minimized icons always have a scale slot
  const totalCount = $derived(items.length + minimized.length + trailing.length);

  let scales = $state<number[]>([]);

  // Icon element refs for center-X measurement — plain mutable array populated by
  // bind:this={iconRefs[idx]} in the template. Not $state; Svelte updates these
  // bindings each render so stale slots are naturally overwritten.
  let iconRefs: (HTMLElement | null)[] = [];

  // Dock container ref
  let dockEl = $state<HTMLElement | null>(null);

  function showDock() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    visible = true;
  }

  function scheduledHide() {
    if (hideTimer !== null) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      visible = false;
      hideTimer = null;
    }, 400);
  }

  function onHotzoneEnter() {
    if (!isTouch) showDock();
  }

  function onDockEnter() {
    if (!isTouch) showDock();
  }

  function onDockLeave() {
    if (!isTouch) scheduledHide();
    // Also reset magnification scales
    scales = Array(totalCount).fill(1);
  }

  function onDockPointerMove(e: PointerEvent) {
    if (reducedMotion || isTouch) return;
    const newScales = Array(totalCount).fill(1);
    iconRefs.forEach((ref, i) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(centerX - e.clientX);
      newScales[i] = magnify(dist);
    });
    scales = newScales;
  }


  // App id → real icon URL for minimized windows.
  function iconForApp(app: string): string | undefined {
    switch (app) {
      case 'finder': return appIcons.finder;
      case 'doc': return appIcons.notes;
      case 'photos': return appIcons.photos;
      default: return appIcons.notes;
    }
  }
</script>

<!-- Hot zone — always present, handles pointer entry from bottom edge.
     role="presentation" is appropriate: this is a pointer-only affordance with
     no semantic meaning; keyboard users reach the dock via focus-within instead. -->
{#if !isTouch}
  <div
    class="hotzone"
    role="presentation"
    onpointerenter={onHotzoneEnter}
  ></div>
{/if}

<!-- role="presentation" on the wrapper: the interactive content is the <nav>
     inside; the wrapper itself is a layout/animation container. -->
<div
  class="dock-wrapper"
  class:visible
  class:reduced={reducedMotion}
  role="presentation"
  bind:this={dockEl}
  onpointerenter={onDockEnter}
  onpointerleave={onDockLeave}
  onpointermove={onDockPointerMove}
>
  <nav class="dock" aria-label="Dock">
    <!-- Main items -->
    {#each items as item, i (item.id)}
      {@const scale = scales[i] ?? 1}
      <div class="icon-slot" style:width={`${44 * scale}px`}>
        <button
          class="icon-btn"
          style:transform={`scale(${scale})`}
          onclick={item.action}
          title={item.label}
          aria-label={item.running ? `${item.label} (open)` : item.label}
          bind:this={iconRefs[i]}
        >
          {#if item.iconUrl}
            <img class="app-icon" src={item.iconUrl} alt="" draggable="false" />
          {/if}
          <span class="tooltip">{item.label}</span>
        </button>
        {#if item.running}
          <span class="running-dot" aria-hidden="true"></span>
        {/if}
      </div>
    {/each}

    <!-- Minimized windows section (hidden on mobile) -->
    {#if !isMobile && minimized.length > 0}
      <div class="divider" aria-hidden="true"></div>
      {#each minimized as win, mi (win.id)}
        {@const idx = items.length + mi}
        {@const scale = scales[idx] ?? 1}
        <div class="icon-slot" style:width={`${44 * scale}px`}>
          <button
            class="icon-btn minimized-win"
            style:transform={`scale(${scale})`}
            onclick={() => onrestore(win.id)}
            title={win.title}
            aria-label={`Restore ${win.title}`}
            data-restore-id={win.id}
            bind:this={iconRefs[idx]}
          >
            {#if win.app === 'project' && win.props.thumbUrl}
              <span class="win-thumb">
                <img src={win.props.thumbUrl as string} alt={win.title}/>
              </span>
            {:else if iconForApp(win.app)}
              <img class="app-icon" src={iconForApp(win.app)} alt="" draggable="false" />
            {/if}
            <span class="tooltip">{win.title}</span>
          </button>
        </div>
      {/each}
    {/if}

    <!-- Trailing items (Trash) — hidden on mobile -->
    {#if !isMobile && trailing.length > 0}
      <div class="divider" aria-hidden="true"></div>
      {#each trailing as item, ti (item.id)}
        {@const idx = items.length + minimized.length + ti}
        {@const scale = scales[idx] ?? 1}
        <div class="icon-slot" style:width={`${44 * scale}px`}>
          <button
            class="icon-btn"
            style:transform={`scale(${scale})`}
            onclick={item.action}
            title={item.label}
            aria-label={item.running ? `${item.label} (open)` : item.label}
            bind:this={iconRefs[idx]}
          >
            {#if item.iconUrl}
              <img class="app-icon" src={item.iconUrl} alt="" draggable="false" />
            {/if}
            <span class="tooltip">{item.label}</span>
          </button>
          {#if item.running}
            <span class="running-dot" aria-hidden="true"></span>
          {/if}
        </div>
      {/each}
    {/if}
  </nav>
</div>

<style>
  /* Hot zone: thin strip at the very bottom */
  .hotzone {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    z-index: 9999;
    pointer-events: auto;
  }

  /* Dock wrapper: spans the full width and flex-centers the shelf, which is
     robust across browsers (mixing `translate` with `transform` for centering
     broke centering where the `translate` property is unsupported). */
  .dock-wrapper {
    position: fixed;
    bottom: 8px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 9998;
    pointer-events: none;
    /* Hidden by default: slide below viewport */
    transform: translateY(calc(100% + 12px));
  }

  /* Visible state (mouse hover or keyboard focus within dock) */
  .dock-wrapper.visible,
  .dock-wrapper:focus-within {
    transform: translateY(0);
    pointer-events: auto;
  }

  /* Animate show/hide (skip under reduced motion) */
  @media (prefers-reduced-motion: no-preference) {
    .dock-wrapper:not(.reduced) {
      transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    /* Hiding is slightly slower */
    .dock-wrapper:not(.visible):not(.reduced) {
      transition: transform 240ms cubic-bezier(0.4, 0, 1, 1);
    }
  }

  /* Always visible on touch */
  .dock-wrapper.visible.reduced {
    transition: none;
  }

  /* The shelf itself */
  .dock {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    /* Bottom padding leaves room for the running-app dots. */
    padding: 6px 10px 8px;
    background: var(--dock-bg);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 16px;
    border: 1px solid var(--dock-border);
    box-shadow:
      0 2px 16px rgba(0, 0, 0, 0.18),
      0 0 0 0.5px rgba(0, 0, 0, 0.08);
    list-style: none;
    margin: 0;
    user-select: none;
  }

  /* Icon slot: holds the icon with dynamic layout width */
  .icon-slot {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .icon-slot {
      transition: width 40ms linear;
    }
  }

  /* Icon button: reset button styles, position for tooltip */
  .icon-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    transform-origin: bottom center;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .icon-btn {
      transition: transform 40ms linear;
    }
    .icon-btn:not(:hover) {
      transition: transform 140ms ease-out;
    }
  }

  .app-icon {
    width: 44px;
    height: 44px;
    display: block;
    -webkit-user-drag: none;
  }

  /* Running-app indicator: the dot macOS puts under an open app. */
  .running-dot {
    position: absolute;
    bottom: -5px;
    left: 50%;
    translate: -50% 0;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--dock-dot);
    pointer-events: none;
  }

  .minimized-win .win-thumb {
    display: block;
    width: 44px;
    height: 44px;
    border-radius: 9.68px;
    overflow: hidden;
  }

  .minimized-win .win-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Vertical hairline divider */
  .divider {
    width: 1px;
    height: 32px;
    background: var(--dock-divider);
    margin: 0 2px 6px;
    flex-shrink: 0;
    align-self: flex-end;
  }

  /* Tooltip: macOS-style dark pill above icon */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    translate: -50% 0;
    white-space: nowrap;
    background: rgba(60, 60, 60, 0.9);
    color: white;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 5px;
    pointer-events: none;
    opacity: 0;
    z-index: 1;
  }

  /* Tooltip arrow */
  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    translate: -50% 0;
    border: 4px solid transparent;
    border-top-color: rgba(60, 60, 60, 0.9);
  }

  /* Show tooltip on hover or keyboard focus */
  .icon-btn:hover .tooltip,
  .icon-btn:focus-visible .tooltip {
    opacity: 1;
  }

  /* Focus ring for keyboard navigation */
  .icon-btn:focus-visible {
    outline: 2px solid var(--accent, #0064e1);
    outline-offset: 2px;
    border-radius: 9.68px;
  }
</style>
