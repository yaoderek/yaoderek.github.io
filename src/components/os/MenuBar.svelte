<script lang="ts">
  import { onMount } from 'svelte';

  type Props = {
    onopenpath: (path: string) => void;
    onopenabout: () => void;
    ontogglelist: (view: 'columns' | 'list') => void;
    finderView: 'columns' | 'list';
    reducedMotion: boolean;
    ontogglereducedmotion: () => void;
    isMobile?: boolean;
    darkMode?: boolean;
    ontoggledark?: () => void;
  };

  let {
    onopenpath,
    onopenabout,
    ontogglelist,
    finderView,
    reducedMotion,
    ontogglereducedmotion,
    isMobile = false,
    darkMode = false,
    ontoggledark,
  }: Props = $props();

  // Which menu is open: null | 'apple' | 'file' | 'view'
  let openMenu = $state<null | 'apple' | 'file' | 'view'>(null);

  // Clock
  let clockStr = $state('');

  function formatClock(d: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[d.getDay()];
    const mon = months[d.getMonth()];
    const date = d.getDate();
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const mm = m.toString().padStart(2, '0');
    return `${day} ${mon} ${date}  ${h}:${mm} ${ampm}`;
  }

  onMount(() => {
    clockStr = formatClock(new Date());
    const id = setInterval(() => {
      clockStr = formatClock(new Date());
    }, 30000);
    return () => clearInterval(id);
  });

  // Click outside closes menus
  function onDocumentClick(e: MouseEvent) {
    const bar = document.getElementById('menu-bar');
    if (bar && !bar.contains(e.target as Node)) {
      openMenu = null;
    }
  }

  onMount(() => {
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  });

  // Menu name order for left/right navigation
  const menuOrder: Array<'apple' | 'file' | 'view'> = ['apple', 'file', 'view'];

  // Focus a menuitem by index within the currently open menu dropdown.
  function focusMenuItem(menuName: 'apple' | 'file' | 'view', index: number) {
    const bar = document.getElementById('menu-bar');
    if (!bar) return;
    // Find the open dropdown for this menu
    const dropdown = bar.querySelector<HTMLElement>(`[data-menu="${menuName}"] .dropdown`);
    if (!dropdown) return;
    const items = Array.from(
      dropdown.querySelectorAll<HTMLElement>('[role="menuitem"] button, [role="menuitem"] a')
    );
    const target = items[index];
    if (target) target.focus();
  }

  // Keyboard handler for menu bar navigation
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (openMenu !== null) {
        // Prevent Desktop's Esc handler from also closing a window
        e.stopPropagation();
        openMenu = null;
      }
      return;
    }

    if (openMenu === null) return;

    const menuName = openMenu;
    const bar = document.getElementById('menu-bar');
    if (!bar) return;
    const dropdown = bar.querySelector<HTMLElement>(`[data-menu="${menuName}"] .dropdown`);
    if (!dropdown) return;
    const items = Array.from(
      dropdown.querySelectorAll<HTMLElement>('[role="menuitem"] button, [role="menuitem"] a')
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const focused = document.activeElement as HTMLElement;
      const idx = items.indexOf(focused);
      // Wrap: ArrowDown at last item goes to first (WAI-ARIA menu behavior)
      const next = idx < 0 ? 0 : (idx + 1) % items.length;
      items[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const focused = document.activeElement as HTMLElement;
      const idx = items.indexOf(focused);
      // Wrap: ArrowUp at first item goes to last
      const prev = idx <= 0 ? items.length - 1 : idx - 1;
      items[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const curIdx = menuOrder.indexOf(menuName);
      // Wrap: ArrowLeft at leftmost menu wraps to rightmost (macOS behavior)
      const prev = menuOrder[(curIdx - 1 + menuOrder.length) % menuOrder.length];
      openMenu = prev;
      // Focus first item in the newly opened menu after render
      setTimeout(() => focusMenuItem(prev, 0), 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const curIdx = menuOrder.indexOf(menuName);
      // Wrap: ArrowRight at rightmost menu wraps to leftmost
      const next = menuOrder[(curIdx + 1) % menuOrder.length];
      openMenu = next;
      setTimeout(() => focusMenuItem(next, 0), 0);
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  function toggleMenu(name: 'apple' | 'file' | 'view') {
    openMenu = openMenu === name ? null : name;
  }

  function hoverMenu(name: 'apple' | 'file' | 'view') {
    if (openMenu !== null && openMenu !== name) {
      openMenu = name;
    }
  }

  function closeMenu() {
    openMenu = null;
  }
</script>

<div
  id="menu-bar"
  class="menubar"
  role="menubar"
  aria-label="Menu bar"
>
  {#if !isMobile}
    <!-- Apple glyph -->
    <div class="menu-item-wrap" data-menu="apple">
      <button
        class="menu-title apple-btn"
        class:open={openMenu === 'apple'}
        aria-haspopup="menu"
        aria-expanded={openMenu === 'apple'}
        onclick={() => toggleMenu('apple')}
        onmouseenter={() => hoverMenu('apple')}
        aria-label="Orange menu"
      >
        <!-- The house glyph: an orange, drawn Apple-logo-style (solid
             silhouette with a detached leaf). -->
        <svg width="14" height="15" viewBox="0 0 14 15" fill="currentColor" aria-hidden="true">
          <circle cx="7" cy="9" r="5.4" />
          <path d="M7.3 3.4 C7.3 2 8.4 0.9 10.2 0.8 C10.2 2.3 9.1 3.4 7.3 3.4 Z" />
          <rect x="6.7" y="2.2" width="0.9" height="1.6" rx="0.45" />
        </svg>
      </button>
      {#if openMenu === 'apple'}
        <ul class="dropdown" role="menu">
          <li role="menuitem">
            <button
              class="menu-action"
              onclick={() => { onopenabout(); closeMenu(); }}
            >About this site</button>
          </li>
        </ul>
      {/if}
    </div>
  {/if}

  <!-- Derek Yao (direct button) -->
  <button
    class="menu-title owner-btn"
    onclick={() => { onopenpath('/intro'); }}
  >Derek Yao</button>

  {#if !isMobile}
    <!-- File menu -->
    <div class="menu-item-wrap" data-menu="file">
      <button
        class="menu-title"
        class:open={openMenu === 'file'}
        aria-haspopup="menu"
        aria-expanded={openMenu === 'file'}
        onclick={() => toggleMenu('file')}
        onmouseenter={() => hoverMenu('file')}
      >File</button>
      {#if openMenu === 'file'}
        <ul class="dropdown" role="menu">
          <li role="menuitem">
            <a
              class="menu-action"
              href="https://github.com/yaoderek"
              target="_blank"
              rel="noopener"
              onclick={closeMenu}
            >GitHub ↗</a>
          </li>
          <li role="menuitem">
            <a
              class="menu-action"
              href="https://www.linkedin.com/in/yaoderek/"
              target="_blank"
              rel="noopener"
              onclick={closeMenu}
            >LinkedIn ↗</a>
          </li>
        </ul>
      {/if}
    </div>

    <!-- View menu -->
    <div class="menu-item-wrap" data-menu="view">
      <button
        class="menu-title"
        class:open={openMenu === 'view'}
        aria-haspopup="menu"
        aria-expanded={openMenu === 'view'}
        onclick={() => toggleMenu('view')}
        onmouseenter={() => hoverMenu('view')}
      >View</button>
      {#if openMenu === 'view'}
        <ul class="dropdown" role="menu">
          <li role="menuitem">
            <button
              class="menu-action"
              onclick={() => { ontogglelist('columns'); closeMenu(); }}
            >
              <span class="check">{finderView === 'columns' ? '✓' : ''}</span>
              as Columns
            </button>
          </li>
          <li role="menuitem">
            <button
              class="menu-action"
              onclick={() => { ontogglelist('list'); closeMenu(); }}
            >
              <span class="check">{finderView === 'list' ? '✓' : ''}</span>
              as List
            </button>
          </li>
          <li class="separator" role="separator"></li>
          <li role="menuitem">
            <button
              class="menu-action"
              onclick={() => { ontogglereducedmotion(); closeMenu(); }}
            >
              <span class="check">{reducedMotion ? '✓' : ''}</span>
              Reduce Motion
            </button>
          </li>
        </ul>
      {/if}
    </div>
  {/if}

  <!-- Right side: dark-mode toggle + clock -->
  <div class="right">
    {#if !isMobile}
      <button
        class="menu-title theme-btn"
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title={darkMode ? 'Light mode' : 'Dark mode'}
        aria-pressed={darkMode}
        onclick={() => ontoggledark?.()}
      >
        {#if darkMode}
          <!-- Sun -->
          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="3" />
            <g stroke="currentColor" stroke-width="1" stroke-linecap="round">
              <line x1="6.5" y1="0.5" x2="6.5" y2="2" />
              <line x1="6.5" y1="11" x2="6.5" y2="12.5" />
              <line x1="0.5" y1="6.5" x2="2" y2="6.5" />
              <line x1="11" y1="6.5" x2="12.5" y2="6.5" />
              <line x1="2.3" y1="2.3" x2="3.3" y2="3.3" />
              <line x1="9.7" y1="9.7" x2="10.7" y2="10.7" />
              <line x1="2.3" y1="10.7" x2="3.3" y2="9.7" />
              <line x1="9.7" y1="3.3" x2="10.7" y2="2.3" />
            </g>
          </svg>
        {:else}
          <!-- Crescent moon -->
          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
            <path d="M10.9 8.6 A5 5 0 1 1 4.4 2.1 A4 4 0 0 0 10.9 8.6 Z" />
          </svg>
        {/if}
      </button>
    {/if}
    <span class="clock" aria-live="polite" aria-label="Current time">{clockStr}</span>
  </div>
</div>

<style>
  .menubar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--menubar-h);
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 4px;
    background: var(--bar-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 0.5px solid var(--hairline);
    z-index: 10000;
    font-size: 13px;
    font-family: var(--chrome-font);
    color: var(--text);
    user-select: none;
    -webkit-user-select: none;
  }

  .menu-item-wrap {
    position: relative;
  }

  .menu-title {
    display: flex;
    align-items: center;
    height: var(--menubar-h);
    padding: 0 8px;
    border-radius: 4px;
    font-size: 13px;
    font-family: var(--chrome-font);
    color: var(--text);
    cursor: default;
    transition: background 80ms ease;
  }

  .menu-title:hover,
  .menu-title.open {
    background: var(--hover-dim);
  }

  .owner-btn {
    font-family: var(--chrome-font);
    font-size: 13px;
    font-weight: 700;
  }

  .apple-btn {
    padding: 0 10px;
  }

  .right {
    margin-left: auto;
    display: flex;
    align-items: center;
    padding-right: 8px;
  }

  .clock {
    font-size: 13px;
    font-family: var(--chrome-font);
    color: var(--text);
  }

  /* Dropdown */
  .dropdown {
    position: absolute;
    top: calc(var(--menubar-h) + 2px);
    left: 0;
    min-width: 180px;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    background: var(--menu-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 6px;
    border: 0.5px solid var(--hairline);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(0,0,0,0.08);
    z-index: 10001;
  }

  .menu-action {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px 12px;
    font-size: 13px;
    font-family: var(--chrome-font);
    color: var(--text);
    text-decoration: none;
    border-radius: 0;
    cursor: default;
    gap: 4px;
  }

  .menu-action:hover {
    background: var(--accent);
    color: #fff;
  }

  .check {
    display: inline-block;
    width: 14px;
    text-align: center;
    font-size: 12px;
  }

  .separator {
    height: 0.5px;
    background: var(--hairline);
    margin: 4px 0;
  }
</style>
