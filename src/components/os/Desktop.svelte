<script lang="ts">
  import type { FSNode, AppId } from '../../lib/os/types';
  import type { Win } from '../../lib/os/windows';
  import { findNode } from '../../lib/os/fs';
  import { photoAlbums, photoAt, photoWindowSize } from '../../lib/os/photos';
  import {
    pathForWin,
    urlToOpenPath,
    legacyHashToPath,
    fsPathToUrl,
    withBase,
    stripBase,
  } from '../../lib/os/router';
  import { onMount, tick, type ComponentProps } from 'svelte';
  import {
    open,
    close,
    focus,
    minimize,
    restore,
    toggleFullscreen,
    move,
    resize,
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
  import PhotosWindow from './apps/PhotosWindow.svelte';
  import TrashWindow from './apps/TrashWindow.svelte';

  type Props = {
    tree: FSNode;
    initialPath?: string | null;
    // showResume is accepted now for a stable page contract; used in Task 9.
    showResume: boolean;
    // When true, open a "file not found" doc window after mount (404 page).
    notFound?: boolean;
    // Optimized wallpaper URL (built by OsPage via astro:assets).
    wallpaperUrl?: string | null;
    // Real app-icon URLs for the dock (built by OsPage via astro:assets).
    dockIcons?: Record<string, string>;
  };

  let {
    tree,
    initialPath = null,
    showResume,
    notFound = false,
    wallpaperUrl = null,
    dockIcons = {},
  }: Props = $props();

  /**
   * Appearance: a visitor's own choice sticks, otherwise we follow whatever the
   * system is set to, the way a Mac does.
   */
  function initialDarkMode(): boolean {
    const saved =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('derekos-theme')
        : null;
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  }

  // Dark mode — persisted per visitor, toggled from the menu bar.
  let darkMode = $state(initialDarkMode());

  function toggleDarkMode() {
    darkMode = !darkMode;
    try {
      localStorage.setItem('derekos-theme', darkMode ? 'dark' : 'light');
    } catch {
      /* storage unavailable (private mode) — theme still applies in-session */
    }
  }

  // Deploy base path ('/' locally, '/personal/' on a GitHub Pages project
  // site). All history reads/writes go through withBase/stripBase with this.
  const BASE = import.meta.env.BASE_URL ?? '/';

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

  // Finder view state — consumed by the Finder component.
  let finderView = $state<'columns' | 'list'>('columns');

  // One-shot navigation signal: openPath sets this to a folder path; the Finder
  // adopts it as its selection then calls onnavigated so we clear it back to null.
  let finderNavigateTo = $state<string | null>(null);

  // Live Finder selection, reported via onselect. Drives the URL when no
  // window with a public path is on top (docs/projects read inline).
  let finderSelection = $state<string | null>('/README.txt');

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

  // Per-app default window sizes. A Photos window opened on a picture is sized
  // to that picture instead (see photoWindowSize).
  const SIZES: Record<AppId, { w: number; h: number }> = {
    project: { w: 980, h: 620 },
    doc: { w: 640, h: 560 },
    photos: { w: 780, h: 680 },
    finder: { w: 960, h: 560 },
    about: { w: 420, h: 260 },
    trash: { w: 480, h: 320 },
  };

  // Breathing room between a photo window and the edge of the screen.
  const PHOTOS_MARGIN = 12;

  /** The picture the desktop greets a visitor with, from the life album. */
  const GREETING_PHOTO = 'pier-at-night';

  function viewport() {
    return { vw: window.innerWidth, vh: window.innerHeight };
  }

  // Art and life as Photos albums, read off their folder nodes.
  const albums = $derived(photoAlbums(tree));

  const lifeAlbum = $derived(albums.find((a) => a.id === 'life') ?? null);

  /**
   * Open (or focus) the appropriate window for a filesystem path.
   * - A node with an `open` spec launches that app.
   * - A folder or the root opens/focuses the single Finder window.
   */
  function openPath(path: string) {
    const node = findNode(tree, path);
    if (!node) return;

    // Docs and projects read inline in the Finder's preview pane — select the
    // file rather than opening a window.
    if (node.open && (node.open.app === 'doc' || node.open.app === 'project')) {
      openInFinder(node.path);
      return;
    }

    // The art and life folders and every picture in them belong to the Photos
    // app, which keeps a single window and re-targets it instead of stacking.
    if (node.open && node.open.app === 'photos') {
      const props = node.open.props as { album: string; index?: number };
      openPhotos(props.album, props.index ?? null);
      return;
    }

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
      openInFinder(node.path === '/' ? '/README.txt' : node.path, node.path !== '/');
    }
  }

  /**
   * Open (or focus) the single Finder window with `selection` selected.
   * When the Finder already exists, `navigate` drives its selection via the
   * one-shot signal (false = just focus, e.g. clicking the Finder dock icon).
   */
  function openInFinder(selection: string, navigate = true, x?: number) {
    const { w, h } = SIZES.finder;
    const finderExists = wins.some((w) => w.app === 'finder');
    const vp = viewport();
    wins = open(
      wins,
      {
        app: 'finder',
        title: "derek's mac",
        path: '/',
        props: { initialSelection: selection },
        w,
        h,
        // Spawn centered (slight upward bias, like macOS), not cascaded.
        x: x ?? Math.round((vp.vw - w) / 2),
        y: Math.round(Math.max(24, (vp.vh - h) * 0.42)),
      },
      vp
    );
    if (finderExists && navigate) finderNavigateTo = selection;
  }

  /**
   * Open (or focus) the single Photos window.
   *
   * `album` + `index` target one picture, and a window opened on a picture is
   * sized to it and parked against the right edge. A null album opens a new
   * window on the album list and leaves an existing one where it is.
   */
  function openPhotos(album: string | null, index: number | null) {
    if (albums.length === 0) return;

    const existing = wins.find((w) => w.app === 'photos');
    if (existing) {
      wins = focus(
        wins.map((w) =>
          w.id === existing.id
            ? { ...w, minimized: false, props: { ...w.props, album, index } }
            : w
        ),
        existing.id
      );
      return;
    }

    const vp = viewport();
    const photo = photoAt(albums, album, index);
    const { w, h } = photo ? photoWindowSize(photo, vp) : SIZES.photos;
    wins = open(
      wins,
      {
        app: 'photos',
        title: 'Photos',
        // Internal: one window covers both albums, so it owns no URL.
        path: '/__photos__',
        props: { albums, album, index },
        w,
        h,
        x: photo
          ? vp.vw - w - PHOTOS_MARGIN
          : Math.round((vp.vw - w) / 2 + 150),
        y: Math.round(Math.max(24, (vp.vh - h) / 2)),
      },
      vp
    );
  }

  /**
   * The opening arrangement on a big screen: the README in the Finder, with
   * Photos sized to the greeting photo tucked in beside it on the right.
   */
  function openGreeting() {
    const photos = lifeAlbum?.items ?? [];
    if (photos.length === 0) {
      openPath('/');
      return;
    }
    const found = photos.findIndex((photo) => photo.id === GREETING_PHOTO);
    const index = found >= 0 ? found : photos.length - 1;
    const vp = viewport();
    const { w } = photoWindowSize(photos[index], vp);
    openInFinder(
      '/README.txt',
      false,
      vp.vw - w - PHOTOS_MARGIN - SIZES.finder.w
    );
    openPhotos('life', index);
  }

  /**
   * Mobile has no windows, so the Photos dock icon drills the Files view into
   * the life folder on a random photo instead.
   */
  function openRandomPhotoOnMobile() {
    const photos = lifeAlbum?.items ?? [];
    const path =
      photos.length === 0
        ? '/life'
        : `/life/${photos[Math.floor(Math.random() * photos.length)].id}`;
    mobileNavigateTo = path;
    onMobileNavigate(path);
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
<p>▸ <a href="${withBase('/', BASE)}">back to derek's mac</a></p>`,
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
      history.replaceState({}, '', withBase(_hashMapped, BASE));
      // Re-assign in case the component mounted in mobile mode after isMobile
      // resolved (rare, but keeps the $state consistent).
      effectiveInitialPath = _hashMapped === '/' ? null : _hashMapped;
    }

    // On desktop: open Finder at root on mount, then any deep-linked path.
    if (!isMobile) {
      if (notFound) {
        openPath('/');
        openNotFound();
      } else if (effectiveInitialPath) {
        openPath('/');
        openPath(effectiveInitialPath);
      } else {
        openGreeting();
      }
    }

    // Back/forward navigation drives the window manager. The URL-sync $effect's
    // equality check (desired !== location.pathname) prevents duplicate pushState.
    const onPopState = () => {
      const target = urlToOpenPath(stripBase(location.pathname, BASE));
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
    // A window with a public path on top wins; otherwise the URL follows what
    // the Finder selection is showing inline.
    let urlPath = pathForWin(topWindow(wins));
    if (urlPath === '/') urlPath = fsPathToUrl(finderSelection ?? '/');
    const desired = withBase(urlPath, BASE);
    // On the 404 page, leave the (unknown) URL untouched so it stays shareable
    // as the "not found" address the visitor actually hit.
    if (!notFound && desired !== location.pathname) {
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
  // magnification, filmstrip scrolling) are gated on reducedMotion.
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
  // The equality check (url !== location.pathname) prevents duplicate pushState
  // during popstate-driven navigation.
  function onMobileNavigate(path: string) {
    // Map the FS path to a routable URL: internal/root-level paths → '/'.
    const url = withBase(fsPathToUrl(path), BASE);
    if (url !== location.pathname) {
      history.pushState({}, '', url);
    }
  }

  // Apps with a window open right now — drives the dock's running indicator.
  const openApps = $derived(new Set(wins.map((w) => w.app)));

  // Dock items ($derived so showResume is tracked reactively)
  const dockItems = $derived([
    {
      id: 'finder',
      label: 'Finder',
      iconUrl: dockIcons.finder,
      running: openApps.has('finder'),
      action: () => openPath('/'),
    },
    {
      id: 'notes',
      label: 'Notes',
      iconUrl: dockIcons.notes,
      action: () => openPath('/writing'),
    },
    {
      id: 'photos',
      label: 'Photos',
      iconUrl: dockIcons.photos,
      running: openApps.has('photos'),
      action: () =>
        isMobile ? openRandomPhotoOnMobile() : openPhotos(null, null),
    },
    ...(showResume
      ? [{
          id: 'resume',
          label: 'Résumé',
          iconUrl: dockIcons.preview,
          action: () => window.open(withBase('/resume.pdf', BASE), '_blank', 'noopener'),
        }]
      : []),
    {
      id: 'mail',
      label: 'Mail',
      iconUrl: dockIcons.mail,
      action: () => { location.href = 'mailto:yaoderek06@gmail.com'; },
    },
    {
      id: 'github',
      label: 'GitHub',
      iconUrl: dockIcons.github,
      action: () => window.open('https://github.com/yaoderek', '_blank', 'noopener'),
    },
  ]);

  const dockTrailing = $derived([
    {
      id: 'trash',
      label: 'Trash',
      iconUrl: dockIcons.trash,
      running: openApps.has('trash'),
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
  ]);
</script>

<div
  class="desktop"
  class:theme-dark={darkMode}
  style:background-image={wallpaperUrl ? `url(${wallpaperUrl})` : undefined}
>
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
    {darkMode}
    ontoggledark={toggleDarkMode}
  />

  <Dock
    items={dockItems}
    trailing={dockTrailing}
    appIcons={dockIcons}
    minimized={wins.filter((w) => w.minimized)}
    onrestore={(id) => (wins = restore(wins, id))}
    {reducedMotion}
    {isMobile}
  />

  {#if isMobile}
    <div id="main-content" class="mobile-layer">
      <MobileFiles
        {tree}
        initialPath={effectiveInitialPath}
        onnavigate={onMobileNavigate}
        navigateTo={mobileNavigateTo}
        onnavigated={() => (mobileNavigateTo = null)}
        {reducedMotion}
      />
    </div>
  {:else}
    <!-- id="main-content": target for the skip-to-content link -->
    <div id="main-content" class="windows-layer">
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
          onresize={(x, y, w, h) => (wins = resize(wins, win.id, x, y, w, h))}
          {reducedMotion}
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
              onselect={(p) => (finderSelection = p)}
            />
          {:else if win.app === 'about'}
            <AboutWindow />
          {:else if win.app === 'project'}
            <ProjectWindow {...win.props as ComponentProps<typeof ProjectWindow>} />
          {:else if win.app === 'doc'}
            <DocWindow {...win.props as ComponentProps<typeof DocWindow>} />
          {:else if win.app === 'photos'}
            <PhotosWindow
              {...win.props as ComponentProps<typeof PhotosWindow>}
              active={win.id === topId}
              {reducedMotion}
            />
          {:else if win.app === 'trash'}
            <TrashWindow />
          {/if}
        </Window>
      {/each}
    </div>
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
    /* Fallback while the wallpaper image loads (deep Big Sur indigo). */
    background-color: #1a2151;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }

  /* Desktop windows layer: zero-size passthrough container (anchor target only) */
  .windows-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .windows-layer > :global(*) {
    pointer-events: auto;
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
