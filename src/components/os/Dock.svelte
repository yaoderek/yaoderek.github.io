<script lang="ts">
  import { magnify } from '../../lib/os/dock';
  import type { Win } from '../../lib/os/windows';
  import { onDestroy } from 'svelte';

  type DockItem = {
    id: string;
    label: string;
    action: () => void;
  };

  type Props = {
    items: DockItem[];
    trailing?: DockItem[];
    minimized: Win[];
    onrestore: (id: number) => void;
    reducedMotion: boolean;
    isMobile?: boolean;
  };

  let { items, trailing = [], minimized, onrestore, reducedMotion, isMobile = false }: Props = $props();

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


  // App id → icon glyph mapping for minimized windows
  function glyphForApp(app: string): string {
    switch (app) {
      case 'finder': return 'finder';
      case 'doc': return 'doc';
      case 'gallery': return 'photos';
      case 'project': return 'project';
      default: return 'generic';
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
          aria-label={item.label}
          bind:this={iconRefs[i]}
        >
          {#if item.id === 'finder'}
            <!-- Finder: blue rounded square, white smile glyph -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#1d72e8"/>
              <rect x="4" y="4" width="36" height="36" rx="7.92" fill="#4a9af5"/>
              <!-- Two-tone face simplified: left eye dark, right eye lighter -->
              <circle cx="16" cy="18" r="4" fill="#1a3a6b"/>
              <circle cx="28" cy="18" r="4" fill="#e8f4fd"/>
              <path d="M13 28 Q22 34 31 28" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            </svg>
          {:else if item.id === 'textedit'}
            <!-- TextEdit: white square, gray text lines + pencil -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#f0e6d3"/>
              <rect x="6" y="6" width="32" height="32" rx="4" fill="white" stroke="#d0c8bc" stroke-width="0.5"/>
              <line x1="11" y1="16" x2="33" y2="16" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
              <line x1="11" y1="21" x2="33" y2="21" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
              <line x1="11" y1="26" x2="26" y2="26" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
              <!-- Pencil -->
              <path d="M30 29 L36 23 L40 27 L34 33 Z" fill="#e67e22" stroke="#c0621a" stroke-width="0.5"/>
              <path d="M30 29 L28 38 L36 33 Z" fill="#f5a623" stroke="#c0621a" stroke-width="0.5"/>
              <line x1="36" y1="23" x2="30" y2="29" stroke="#c0621a" stroke-width="0.5"/>
            </svg>
          {:else if item.id === 'photos'}
            <!-- Photos: white square, 4-petal color pinwheel -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#f5f5f5"/>
              <!-- 4 petals -->
              <ellipse cx="22" cy="14" rx="5" ry="8" fill="#e74c3c" transform="rotate(0 22 22)"/>
              <ellipse cx="22" cy="14" rx="5" ry="8" fill="#3498db" transform="rotate(90 22 22)"/>
              <ellipse cx="22" cy="14" rx="5" ry="8" fill="#2ecc71" transform="rotate(180 22 22)"/>
              <ellipse cx="22" cy="14" rx="5" ry="8" fill="#f1c40f" transform="rotate(270 22 22)"/>
              <circle cx="22" cy="22" r="5" fill="white"/>
            </svg>
          {:else if item.id === 'resume'}
            <!-- Résumé: white square, document + person silhouette -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#5b6af5"/>
              <rect x="10" y="8" width="24" height="28" rx="3" fill="white"/>
              <!-- Text lines on document -->
              <line x1="14" y1="16" x2="30" y2="16" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="14" y1="20" x2="30" y2="20" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="14" y1="24" x2="24" y2="24" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"/>
              <!-- Person silhouette -->
              <circle cx="22" cy="30" r="4" fill="#5b6af5"/>
              <path d="M14 40 Q14 34 22 34 Q30 34 30 40" fill="#5b6af5"/>
            </svg>
          {:else if item.id === 'mail'}
            <!-- Mail: blue square, white envelope outline -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#3b9ede"/>
              <rect x="7" y="13" width="30" height="20" rx="2.5" fill="white" stroke="#2980b9" stroke-width="0.5"/>
              <path d="M7 15 L22 24 L37 15" stroke="#2980b9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            </svg>
          {:else if item.id === 'github'}
            <!-- GitHub: dark square, white octocat silhouette -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#24292f"/>
              <!-- Simplified octocat: circle head + cat ears -->
              <circle cx="22" cy="20" r="9" fill="white"/>
              <!-- Left ear -->
              <path d="M13 13 L15 18 L19 15 Z" fill="white"/>
              <!-- Right ear -->
              <path d="M31 13 L29 18 L25 15 Z" fill="white"/>
              <!-- Tentacles (simplified) -->
              <path d="M15 27 Q12 30 13 34 Q16 36 18 33" stroke="white" stroke-width="1.5" fill="none"/>
              <path d="M29 27 Q32 30 31 34 Q28 36 26 33" stroke="white" stroke-width="1.5" fill="none"/>
              <path d="M18 29 Q18 34 22 34 Q26 34 26 29" fill="white"/>
              <!-- Face details -->
              <circle cx="19" cy="20" r="1.5" fill="#24292f"/>
              <circle cx="25" cy="20" r="1.5" fill="#24292f"/>
              <path d="M19 24 Q22 26 25 24" stroke="#24292f" stroke-width="1" fill="none" stroke-linecap="round"/>
            </svg>
          {/if}
          <span class="tooltip">{item.label}</span>
        </button>
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
            {:else if glyphForApp(win.app) === 'finder'}
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <rect width="44" height="44" rx="9.68" fill="#1d72e8"/>
                <rect x="4" y="4" width="36" height="36" rx="7.92" fill="#4a9af5"/>
                <circle cx="16" cy="18" r="4" fill="#1a3a6b"/>
                <circle cx="28" cy="18" r="4" fill="#e8f4fd"/>
                <path d="M13 28 Q22 34 31 28" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              </svg>
            {:else if glyphForApp(win.app) === 'photos'}
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <rect width="44" height="44" rx="9.68" fill="#f5f5f5"/>
                <ellipse cx="22" cy="14" rx="5" ry="8" fill="#e74c3c" transform="rotate(0 22 22)"/>
                <ellipse cx="22" cy="14" rx="5" ry="8" fill="#3498db" transform="rotate(90 22 22)"/>
                <ellipse cx="22" cy="14" rx="5" ry="8" fill="#2ecc71" transform="rotate(180 22 22)"/>
                <ellipse cx="22" cy="14" rx="5" ry="8" fill="#f1c40f" transform="rotate(270 22 22)"/>
                <circle cx="22" cy="22" r="5" fill="white"/>
              </svg>
            {:else}
              <!-- Generic doc / project glyph -->
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <rect width="44" height="44" rx="9.68" fill="#f0e6d3"/>
                <rect x="6" y="6" width="32" height="32" rx="4" fill="white" stroke="#d0c8bc" stroke-width="0.5"/>
                <line x1="11" y1="16" x2="33" y2="16" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
                <line x1="11" y1="21" x2="33" y2="21" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
                <line x1="11" y1="26" x2="26" y2="26" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
              </svg>
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
            aria-label={item.label}
            bind:this={iconRefs[idx]}
          >
            <!-- Trash icon -->
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <rect width="44" height="44" rx="9.68" fill="#e0e0e5"/>
              <rect x="10" y="13" width="24" height="3.5" rx="1.5" fill="#a0a0aa"/>
              <rect x="18" y="9.5" width="8" height="4" rx="2" fill="none" stroke="#a0a0aa" stroke-width="1.5"/>
              <path d="M12 17 L14 36 Q14 38 16 38 H28 Q30 38 30 36 L32 17 Z" fill="#b8b8c2"/>
              <line x1="19" y1="20" x2="18" y2="36" stroke="#a0a0aa" stroke-width="1"/>
              <line x1="22" y1="20" x2="22" y2="36" stroke="#a0a0aa" stroke-width="1"/>
              <line x1="25" y1="20" x2="26" y2="36" stroke="#a0a0aa" stroke-width="1"/>
            </svg>
            <span class="tooltip">{item.label}</span>
          </button>
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

  /* Dock wrapper: positions the shelf at bottom center */
  .dock-wrapper {
    position: fixed;
    bottom: 8px;
    left: 50%;
    translate: -50% 0;
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
    padding: 6px 10px 4px;
    background: rgba(250, 250, 250, 0.55);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.6);
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

  .icon-btn svg {
    width: 44px;
    height: 44px;
    display: block;
    border-radius: 9.68px;
    overflow: hidden;
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
    background: rgba(0, 0, 0, 0.15);
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
