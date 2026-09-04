<script lang="ts">
  import { magnify } from '../../lib/os/dock';
  import type { Win } from '../../lib/os/windows';

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

  // Touch device detection — no magnification, since there's no pointer to
  // track. The dock itself is always on screen either way.
  const isTouch =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: none)').matches
      : false;

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

  function onDockLeave() {
    // Settle the icons back to their resting size once the pointer leaves.
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
      case 'notes': return appIcons.notes;
      case 'doc': return appIcons.notes;
      case 'photos': return appIcons.photos;
      case 'calendar': return appIcons.calendar;
      default: return appIcons.notes;
    }
  }
</script>

<!-- role="presentation" on the wrapper: the interactive content is the <nav>
     inside; the wrapper itself is a layout container. -->
<div
  class="dock-wrapper"
  role="presentation"
  bind:this={dockEl}
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
            {#if iconForApp(win.app)}
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
  /* Dock wrapper: spans the full width and flex-centers the shelf, which is
     robust across browsers (mixing `translate` with `transform` for centering
     broke centering where the `translate` property is unsupported).

     The dock never hides: it sits on the desktop the whole time, so the
     wrapper stays put and only the shelf inside it takes pointer events. */
  .dock-wrapper {
    position: fixed;
    bottom: 8px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 9998;
    pointer-events: none;
  }

  .dock-wrapper > :global(*) {
    pointer-events: auto;
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
