<script lang="ts">
  import wallpaper from '../../assets/wallpaper.svg';
  import type { FSNode, AppId } from '../../lib/os/types';
  import type { Win } from '../../lib/os/windows';
  import { findNode } from '../../lib/os/fs';
  import { onMount, type ComponentProps } from 'svelte';
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
  };

  let { tree, initialPath = null, showResume }: Props = $props();

  let wins = $state<Win[]>([]);

  // Finder view state — consumed by the Finder component.
  let finderView = $state<'columns' | 'list'>('columns');

  // One-shot navigation signal: openPath sets this to a folder path; the Finder
  // adopts it as its selection then calls onnavigated so we clear it back to null.
  let finderNavigateTo = $state<string | null>(null);

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

  onMount(() => {
    // Open Finder at root on mount, then any deep-linked path.
    openPath('/');
    if (initialPath) openPath(initialPath);
  });

  const topId = $derived(topWindow(wins)?.id ?? null);

  function activeId(): number | null {
    return topId;
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
  <MenuBar
    onopenpath={openPath}
    onopenabout={openAbout}
    ontogglelist={toggleList}
    {finderView}
    {reducedMotion}
    ontogglereducedmotion={toggleReducedMotion}
  />

  <Dock
    items={dockItems}
    trailing={dockTrailing}
    minimized={wins.filter((w) => w.minimized)}
    onrestore={(id) => (wins = restore(wins, id))}
    {reducedMotion}
  />

  {#each wins as win (win.id)}
    <Window
      {win}
      active={win.id === activeId()}
      onfocus={() => (wins = focus(wins, win.id))}
      onclose={() => (wins = close(wins, win.id))}
      onminimize={() => (wins = minimize(wins, win.id))}
      onfullscreen={() => (wins = toggleFullscreen(wins, win.id))}
      onmove={(x, y) => (wins = move(wins, win.id, x, y))}
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
</div>

<style>
  .desktop {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }
</style>
