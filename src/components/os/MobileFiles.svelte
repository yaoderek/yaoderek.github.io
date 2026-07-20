<script lang="ts">
  import { onMount } from 'svelte';
  import type { FSNode } from '../../lib/os/types';
  import { findNode } from '../../lib/os/fs';
  import Icon from './Icon.svelte';
  import ProjectWindow from './apps/ProjectWindow.svelte';
  import DocWindow from './apps/DocWindow.svelte';
  import GalleryWindow from './apps/GalleryWindow.svelte';
  import type { ComponentProps } from 'svelte';

  type Props = {
    tree: FSNode;
    initialPath?: string | null;
    onnavigate?: ((path: string) => void) | null;
    navigateTo?: string | null;
    onnavigated?: (() => void) | null;
    /** Passed from Desktop's reducedMotion state (View-menu toggle).
     *  Combined with the local media-query result as a fallback. */
    reducedMotion?: boolean;
  };

  let {
    tree,
    initialPath = null,
    onnavigate = null,
    navigateTo = null,
    onnavigated = null,
    reducedMotion: propReducedMotion = false,
  }: Props = $props();

  // Stack of FS paths; top of stack = current view.
  let stack = $state<string[]>(['/']);
  // Whether we are viewing a file item (vs. a folder listing).
  let viewingItem = $state(false);

  const current = $derived(stack[stack.length - 1]);

  // Reduced motion: prop takes precedence (View-menu toggle from Desktop);
  // media query stays as a fallback for OS-level preference.
  const mediaReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const reducedMotion = $derived(propReducedMotion || mediaReducedMotion);

  // Depth key drives the slide animation class.
  let animDir = $state<'push' | 'pop' | null>(null);
  // We flip this to trigger CSS transition replay.
  let viewKey = $state(0);

  // Build initial stack from initialPath.
  onMount(() => {
    if (initialPath && initialPath !== '/') {
      buildStackFor(initialPath, /* notify */ false);
    }
  });

  // React to external navigateTo signal (browser back/forward).
  $effect(() => {
    if (navigateTo !== null && navigateTo !== undefined) {
      buildStackFor(navigateTo, /* notify */ false);
      onnavigated?.();
    }
  });

  /**
   * Build the nav stack for a given path without calling onnavigate (used
   * for initial hydration and popstate-driven navigation).
   */
  function buildStackFor(path: string, notify: boolean) {
    if (path === '/') {
      stack = ['/'];
      viewingItem = false;
      if (notify) onnavigate?.('/');
      return;
    }

    const node = findNode(tree, path);
    if (!node) return;

    if (node.kind === 'Folder') {
      // e.g. /projects → stack ['/', '/projects']
      const parts = path.split('/').filter(Boolean);
      const newStack: string[] = ['/'];
      let cur = '';
      for (const part of parts) {
        cur += '/' + part;
        newStack.push(cur);
      }
      stack = newStack;
      viewingItem = false;
    } else {
      // Item: push parent folder + item.
      const parts = path.split('/').filter(Boolean);
      const parentParts = parts.slice(0, -1);
      const newStack: string[] = ['/'];
      let cur = '';
      for (const part of parentParts) {
        cur += '/' + part;
        newStack.push(cur);
      }
      stack = newStack;
      viewingItem = true;
      // We store the item path at end of stack
      stack = [...stack, path];
    }

    if (notify) onnavigate?.(path);
  }

  // Current folder node (for listing) or parent folder when viewing item.
  const currentFolder = $derived((): FSNode | null => {
    if (viewingItem) {
      // parent folder = second-to-last in stack
      const parentPath = stack[stack.length - 2] ?? '/';
      return findNode(tree, parentPath);
    }
    return findNode(tree, current);
  });

  // Current item node (when viewingItem).
  const currentItem = $derived((): FSNode | null => {
    if (viewingItem) return findNode(tree, current);
    return null;
  });

  // Children of the current folder.
  const folderChildren = $derived((): FSNode[] => {
    const folder = currentFolder();
    return folder?.children ?? [];
  });

  // Parent name for back button label.
  const parentName = $derived((): string => {
    if (stack.length <= 1 && !viewingItem) return '';
    if (viewingItem) {
      // back goes to parent folder
      const parentPath = stack[stack.length - 2] ?? '/';
      if (parentPath === '/') return "derek's mac";
      const n = findNode(tree, parentPath);
      return n?.name ?? 'Back';
    } else {
      // back goes one folder up
      const prevPath = stack[stack.length - 2] ?? '/';
      if (prevPath === '/') return "derek's mac";
      const n = findNode(tree, prevPath);
      return n?.name ?? 'Back';
    }
  });

  // Title of the current view.
  const viewTitle = $derived((): string => {
    if (viewingItem) {
      const item = currentItem();
      return item?.name ?? '';
    }
    if (current === '/') return "derek's mac";
    const n = findNode(tree, current);
    return n?.name ?? '';
  });

  function canGoBack(): boolean {
    return stack.length > 1 || viewingItem;
  }

  function goBack() {
    if (!canGoBack()) return;
    animDir = 'pop';
    viewKey += 1;

    if (viewingItem) {
      // Pop the item path off the stack, then stop viewing item.
      stack = stack.slice(0, -1);
      viewingItem = false;
      onnavigate?.(stack[stack.length - 1] ?? '/');
    } else {
      stack = stack.slice(0, -1);
      onnavigate?.(stack[stack.length - 1]);
    }
  }

  function openChild(node: FSNode) {
    animDir = 'push';
    viewKey += 1;

    if (node.kind === 'Folder') {
      stack = [...stack, node.path];
      viewingItem = false;
      onnavigate?.(node.path);
    } else if (node.open) {
      stack = [...stack, node.path];
      viewingItem = true;
      onnavigate?.(node.path);
    }
  }
</script>

<div class="mobile-files">
  <!-- Top bar -->
  <div class="topbar">
    {#if canGoBack()}
      <button class="back-btn" onclick={goBack} aria-label="Back">
        ‹ {parentName()}
      </button>
    {:else}
      <span class="back-placeholder"></span>
    {/if}
    <span class="topbar-title">{viewTitle()}</span>
    <span class="topbar-right"></span>
  </div>

  <!-- Content -->
  {#key viewKey}
    <!-- role="presentation": this div is a CSS animation container only;
         interactive content is inside (ul/buttons/app components). -->
    <div
      class="view-wrap"
      role="presentation"
      class:push={animDir === 'push' && !reducedMotion}
      class:pop={animDir === 'pop' && !reducedMotion}
    >
      {#if viewingItem}
        {@const item = currentItem()}
        {#if item?.open}
          <div class="item-view">
            {#if item.open.app === 'project'}
              <ProjectWindow {...item.open.props as ComponentProps<typeof ProjectWindow>} />
            {:else if item.open.app === 'doc'}
              <DocWindow {...item.open.props as ComponentProps<typeof DocWindow>} />
            {:else if item.open.app === 'gallery'}
              <GalleryWindow
                {...item.open.props as ComponentProps<typeof GalleryWindow>}
                active={true}
              />
            {/if}
          </div>
        {/if}
      {:else}
        <ul class="file-list" role="list">
          {#each folderChildren() as node (node.path)}
            <li class="file-row" role="listitem">
              <button
                class="file-btn"
                onclick={() => openChild(node)}
                aria-label={node.name}
              >
                <span class="file-icon">
                  <Icon kind={node.icon as 'folder' | 'doc' | 'app' | 'image'} size={28} thumb={(node.open?.props?.thumbUrl as string | undefined) ?? null} />
                </span>
                <span class="file-name">{node.name}</span>
                <span class="file-chevron" aria-hidden="true">›</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/key}
</div>

<style>
  .mobile-files {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg, #f5f5f5);
    overflow: hidden;
  }

  /* ---- Top bar ---- */
  .topbar {
    flex: 0 0 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    background: rgba(250, 250, 250, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 0.5px solid var(--hairline, rgba(0,0,0,0.12));
    position: relative;
    z-index: 1;
  }

  .back-btn {
    font-size: 15px;
    font-family: var(--chrome-font, system-ui, sans-serif);
    color: var(--accent, #0a84ff);
    padding: 4px 8px;
    min-width: 60px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 40%;
    cursor: pointer;
  }

  .back-placeholder {
    min-width: 60px;
  }

  .topbar-title {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 15px;
    font-weight: 600;
    font-family: var(--chrome-font, system-ui, sans-serif);
    color: var(--text, #1c1c1e);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 50%;
    pointer-events: none;
  }

  .topbar-right {
    min-width: 60px;
  }

  /* ---- View container ---- */
  .view-wrap {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  }

  /* Slide push: incoming from right */
  @media (prefers-reduced-motion: no-preference) {
    .view-wrap.push {
      animation: slide-in-right 240ms ease-out both;
    }

    .view-wrap.pop {
      animation: slide-in-left 240ms ease-out both;
    }

    @keyframes slide-in-right {
      from { transform: translateX(40px); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }

    @keyframes slide-in-left {
      from { transform: translateX(-40px); opacity: 0; }
      to   { transform: translateX(0);     opacity: 1; }
    }
  }

  /* ---- File list ---- */
  .file-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .file-row {
    border-bottom: 0.5px solid var(--hairline, rgba(0,0,0,0.12));
    margin-left: 52px; /* inset separator */
  }

  .file-row:last-child {
    border-bottom: none;
  }

  .file-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 10px 16px 10px 0;
    margin-left: -52px;
    padding-left: calc(52px);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 80ms ease;
  }

  .file-btn:active {
    background: rgba(0, 0, 0, 0.06);
  }

  .file-icon {
    flex: 0 0 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .file-name {
    flex: 1 1 auto;
    font-size: 15px;
    font-family: var(--chrome-font, system-ui, sans-serif);
    color: var(--text, #1c1c1e);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-chevron {
    flex: 0 0 auto;
    font-size: 17px;
    color: var(--text-dim, #8e8e93);
    padding-right: 16px;
  }

  /* ---- Item view ---- */
  .item-view {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
