<script lang="ts">
  import wallpaper from '../../assets/wallpaper.svg';
  import type { FSNode, AppId } from '../../lib/os/types';
  import type { Win } from '../../lib/os/windows';
  import { findNode } from '../../lib/os/fs';
  import { pathForWin, urlToOpenPath, legacyHashToPath, fsPathToUrl } from '../../lib/os/router';
  import { onMount, tick, type ComponentProps } from 'svelte';
  import {
    open,
    close,
    focus,
    minimize,
    restore,
    toggleFullscreen,
    move,
    topWindow,
  } from '../../lib/os/windows';
  import Window from './Window.svelte';
  import MenuBar from './MenuBar.svelte';
  import Finder from './Finder.svelte';
  import Dock from './Dock.svelte';
  import MobileFiles from './MobileFiles.svelte';
  import AboutWindow from './apps/AboutWindow.svelte';
  import ProjectWindow from './apps/ProjectWindow.svelte';
  import DocWindow from './apps/DocWindow.svelte';
  import GalleryWindow from './apps/GalleryWindow.svelte';
  import TrashWindow from './apps/TrashWindow.svelte';

  type Props = {
    tree: FSNode;
    initialPath?: string | null;
    // showResume is accepted now for a stable page contract; used in Task 9.
    showResume: boolean;
    // When true, open a "file not found" doc window after mount (404 page).
    notFound?: boolean;
  };

  let { tree, initialPath = null, showResume, notFound = false }: Props = $props();

  // Compute the effective initial path eagerly at component-init time (not in
  // onMount) so MobileFiles can receive it as a prop on first render.
  // Guard typeof location for jsdom / SSR environments where it may be absent.
  const _hashMapped =
    typeof location !== 'undefined' ? legacyHashToPath(location.hash) : null;
  // $state so the template re-renders after onMount updates it (belt-and-suspenders;
  // the eager init means MobileFiles already has the right value on first mount).
  // svelte-ignore state_referenced_locally
  let effectiveInitialPath = $state<string | null>(
    _hashMapped !== null ? (_hashMapped === '/' ? null : _hashMapped) : initialPath
  );

  let wins = $state<Win[]>([]);

  // Set while handling a popstate event so the URL-sync $effect does not push a
  // duplicate history entry for a navigation the browser already performed.
  let syncingFromPop = false;

  // Finder view state — consumed by the Finder component.
  let finderView = $state<'columns' | 'list'>('columns');

  // One-shot navigation signal: openPath sets this to a folder path; the Finder
  // adopts it as its selection then calls onnavigated so we clear it back to null.
  let finderNavigateTo = $state<string | null>(null);

  // Mobile breakpoint detection — reactive via matchMedia change listener.
  const mq =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 768px)')
      : null;

  let isMobile = $state(mq ? mq.matches : false);

  // One-shot navigation signal for MobileFiles (mirrors finderNavigateTo pattern).
  let mobileNavigateTo = $state<string | null>(null);

  // Reduced motion state — initialised from matchMedia with jsdom guard.
  let reducedMotion = $state(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // Per-app default window sizes.
  const SIZES: Record<AppId, { w: number; h: number }> = {
    project: { w: 980, h: 620 },
    doc: { w: 640, h: 560 },
    gallery: { w: 840, h: 600 },
    finder: { w: 960, h: 560 },
    about: { w: 420, h: 260 },
    trash: { w: 480, h: 320 },
  };

  function viewport() {
    return { vw: window.innerWidth, vh: window.innerHeight };
  }

  /**
   * Open (or focus) the appropriate window for a filesystem path.
   * - A node with an `open` spec launches that app.
   * - A folder or the root opens/focuses the single Finder window.
   */
  function openPath(path: string) {
    const node = findNode(tree, path);
    if (!node) return;

    if (node.open) {
      const { w, h } = SIZES[node.open.app];
      wins = open(
        wins,
        {
          app: node.open.app,
          title: node.name,
          path: node.path,
          props: node.open.props,
          w,
          h,
        },
        viewport()
      );
      return;
    }

    // Folder or root -> single Finder window.
    const isFolder = node.kind === 'Folder' || node.path === '/';
    if (isFolder) {
      const { w, h } = SIZES.finder;
      const finderExists = wins.some((w) => w.app === 'finder');
      const initialSelection = node.path === '/' ? '/README.txt' : node.path;
      wins = open(
        wins,
        {
          app: 'finder',
          title: "derek's mac",
          path: '/',
          props: { initialSelection },
          w,
          h,
        },
        viewport()
      );
      // If the Finder window already existed, `open` only focuses it — drive its
      // selection via the navigate signal so the folder becomes selected.
      if (finderExists && node.path !== '/') finderNavigateTo = node.path;
    }
  }

  /** Open the About window (no filesystem node needed). */
  function openAbout() {
    wins = open(
      wins,
      {
        app: 'about',
        title: 'About this site',
        path: '/__about__',
        props: {},
        w: SIZES.about.w,
        h: SIZES.about.h,
      },
      viewport()
    );
  }

  /** Toggle finder view state. */
  function toggleList(view: 'columns' | 'list') {
    finderView = view;
  }

  /** Toggle reduced motion preference. */
  function toggleReducedMotion() {
    reducedMotion = !reducedMotion;
  }

  /** Open the "file not found" doc window (404 page). */
  function openNotFound() {
    wins = open(
      wins,
      {
        app: 'doc',
        title: 'file not found',
        // Internal path so the URL-sync effect keeps the URL at the 404 route.
        path: '/__notfound__',
        props: {
          title: 'file not found',
          html: `<p>The file you're looking for was moved, deleted, or never existed.</p>
<p>▸ <a href="/">back to derek's mac</a></p>`,
        },
        w: SIZES.doc.w,
        h: SIZES.doc.h,
      },
      viewport()
    );
  }

  onMount(() => {
    // Reactive mobile breakpoint listener
    const onMqChange = (e: MediaQueryListEvent) => { isMobile = e.matches; };
    if (mq) mq.addEventListener('change', onMqChange);

    // Legacy hash shim: rewrite the URL once (hash → real path) and keep
    // effectiveInitialPath in sync. The eager init above already computed the
    // right value for MobileFiles; here we only need the history side-effect.
    if (_hashMapped !== null) {
      history.replaceState({}, '', _hashMapped);
      // Re-assign in case the component mounted in mobile mode after isMobile
      // resolved (rare, but keeps the $state consistent).
      effectiveInitialPath = _hashMapped === '/' ? null : _hashMapped;
    }

    // On desktop: open Finder at root on mount, then any deep-linked path.
    if (!isMobile) {
      openPath('/');
      if (effectiveInitialPath) openPath(effectiveInitialPath);
      if (notFound) openNotFound();
    }

    // Back/forward navigation drives the window manager (never the reverse
    // while handling this event — syncingFromPop guards the $effect).
    const onPopState = () => {
      syncingFromPop = true;
      const target = urlToOpenPath(location.pathname);
      if (isMobile) {
        // On mobile: signal MobileFiles to navigate.
        mobileNavigateTo = target ?? '/';
      } else {
        if (target) {
          openPath(target);
        } else {
          // Root (or unknown) — just surface the Finder.
          openPath('/');
        }
      }
      syncingFromPop = false;
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      if (mq) mq.removeEventListener('change', onMqChange);
      window.removeEventListener('popstate', onPopState);
    };
  });

  // Keep the URL in sync with the top window. Read-only w.r.t. reactive state:
  // it only reads `wins` and calls history.pushState (URL is not reactive), so
  // it can never trigger an effect loop.
  // Skipped on mobile — MobileFiles drives URL via onnavigate callback instead.
  $effect(() => {
    if (isMobile) return;
    const desired = pathForWin(topWindow(wins));
    // On the 404 page, leave the (unknown) URL untouched so it stays shareable
    // as the "not found" address the visitor actually hit.
    if (!notFound && !syncingFromPop && desired !== location.pathname) {
      history.pushState({}, '', desired);
    }
  });

  const topId = $derived(topWindow(wins)?.id ?? null);

  function activeId(): number | null {
    return topId;
  }

  // Map from window id → DOM root element (set via bind:this in Window.svelte's
  // action — we use a plain record populated by registerWindowEl / unregisterWindowEl).
  const windowEls: Record<number, HTMLElement> = {};

  function registerWindowEl(id: number, el: HTMLElement) {
    windowEls[id] = el;
  }
  function unregisterWindowEl(id: number) {
    delete windowEls[id];
  }

  /** Move DOM focus into the top window element (or Finder if no windows). */
  function focusTopWindow() {
    const tw = topWindow(wins);
    if (tw) {
      const el = windowEls[tw.id];
      if (el) el.focus();
    }
  }

  // Esc: close the focused top window (guard: not typing; not while menu is open
  // — MenuBar already handles & stopPropagation's its own Esc; this only fires
  // when no menu dropdown is open).
  // Pure-CSS animations honor prefers-reduced-motion; JS-driven ones (dock
  // magnification, gallery slides, scroll behavior) are gated on reducedMotion.
  // The View-menu toggle is authoritative for JS behavior; CSS media query
  // handles pure-CSS animations independently.
  function onDesktopKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    // Guard: not in an input/textarea/contenteditable
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) return;
    // Close the top window and move focus to the new top window
    if (wins.length === 0) return;
    const tw = topWindow(wins);
    if (!tw) return;
    wins = close(wins, tw.id);
    // Return focus to the new top window (or nothing if all closed)
    tick().then(() => {
      focusTopWindow();
    });
  }

  onMount(() => {
    window.addEventListener('keydown', onDesktopKeydown);
    return () => window.removeEventListener('keydown', onDesktopKeydown);
  });

  // Mobile URL sync: push the current FS path to history when user navigates.
  function onMobileNavigate(path: string) {
    if (syncingFromPop) return;
    // Map the FS path to a routable URL: internal/root-level paths → '/'.
    const url = fsPathToUrl(path);
    if (url !== location.pathname) {
      history.pushState({}, '', url);
    }
  }

  // Dock items ($derived so showResume is tracked reactively)
  const dockItems = $derived([
    {
      id: 'finder',
      label: 'Finder',
      action: () => openPath('/'),
    },
    {
      id: 'textedit',
      label: 'TextEdit',
      action: () => openPath('/writing'),
    },
    {
      id: 'photos',
      label: 'Photos',
      action: () => openPath('/art'),
    },
    ...(showResume
      ? [{
          id: 'resume',
          label: 'Résumé',
          action: () => window.open('/resume.pdf', '_blank', 'noopener'),
        }]
      : []),
    {
      id: 'mail',
      label: 'Mail',
      action: () => { location.href = 'mailto:yaoderek06@gmail.com'; },
    },
    {
      id: 'github',
      label: 'GitHub',
      action: () => window.open('https://github.com/yaoderek', '_blank', 'noopener'),
    },
  ]);

  const dockTrailing = [
    {
      id: 'trash',
      label: 'Trash',
      action: () => {
        wins = open(
          wins,
          {
            app: 'trash',
            title: 'Trash',
            path: '/__trash__',
            props: {},
            w: SIZES.trash.w,
            h: SIZES.trash.h,
          },
          viewport()
        );
      },
    },
  ];
</script>

<div class="desktop" style:background-image={`url(${wallpaper})`}>
  <!-- Skip-to-content: visually hidden until focused, then revealed.
       Targets the top window (or no-js noscript content on SEO pages). -->
  <a
    class="skip-link"
    href="#main-content"
    onclick={(e) => {
      e.preventDefault();
      focusTopWindow();
    }}
  >Skip to content</a>

  <MenuBar
    onopenpath={isMobile ? onMobileNavigate : openPath}
    onopenabout={openAbout}
    ontogglelist={toggleList}
    {finderView}
    {reducedMotion}
    ontogglereducedmotion={toggleReducedMotion}
    {isMobile}
  />

  <Dock
    items={dockItems}
    trailing={dockTrailing}
    minimized={wins.filter((w) => w.minimized)}
    onrestore={(id) => (wins = restore(wins, id))}
    {reducedMotion}
    {isMobile}
  />

  {#if isMobile}
    <div class="mobile-layer">
      <MobileFiles
        {tree}
        initialPath={effectiveInitialPath}
        onnavigate={onMobileNavigate}
        navigateTo={mobileNavigateTo}
        onnavigated={() => (mobileNavigateTo = null)}
      />
    </div>
  {:else}
    {#each wins as win (win.id)}
      <Window
        {win}
        active={win.id === activeId()}
        onfocus={() => (wins = focus(wins, win.id))}
        onclose={() => {
          wins = close(wins, win.id);
          // Return focus to whatever is now on top (after DOM settles).
          tick().then(() => focusTopWindow());
        }}
        onminimize={() => (wins = minimize(wins, win.id))}
        onfullscreen={() => (wins = toggleFullscreen(wins, win.id))}
        onmove={(x, y) => (wins = move(wins, win.id, x, y))}
        onmounted={(el) => registerWindowEl(win.id, el)}
        onunmounted={() => unregisterWindowEl(win.id)}
      >
        {#if win.app === 'finder'}
          <Finder
            {tree}
            initialSelection={(win.props.initialSelection as string | undefined) ??
              null}
            view={finderView}
            active={win.id === topId}
            navigateTo={finderNavigateTo}
            onopen={openPath}
            onnavigated={() => (finderNavigateTo = null)}
          />
        {:else if win.app === 'about'}
          <AboutWindow />
        {:else if win.app === 'project'}
          <ProjectWindow {...win.props as ComponentProps<typeof ProjectWindow>} />
        {:else if win.app === 'doc'}
          <DocWindow {...win.props as ComponentProps<typeof DocWindow>} />
        {:else if win.app === 'gallery'}
          <GalleryWindow
            {...win.props as ComponentProps<typeof GalleryWindow>}
            active={win.id === topId}
          />
        {:else if win.app === 'trash'}
          <TrashWindow />
        {/if}
      </Window>
    {/each}
  {/if}
</div>

<style>
  /* Visually-hidden skip link — shown on :focus-visible for keyboard users. */
  .skip-link {
    position: fixed;
    top: -100%;
    left: 8px;
    z-index: 99999;
    padding: 6px 14px;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-family: var(--chrome-font);
    border-radius: 6px;
    text-decoration: none;
    white-space: nowrap;
  }

  .skip-link:focus-visible {
    top: 30px;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .desktop {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }

  /* Mobile layer: fills the area below the menu bar and above the dock */
  .mobile-layer {
    position: fixed;
    top: var(--menubar-h, 28px);
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background: var(--win-bg, #f5f5f5);
  }
</style>
