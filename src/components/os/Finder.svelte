<script lang="ts">
  import type { FSNode } from '../../lib/os/types';
  import { findNode } from '../../lib/os/fs';
  import { formatDate } from '../../lib/os/format';
  import { onMount, tick } from 'svelte';
  import Icon from './Icon.svelte';
  import PreviewColumn from './PreviewColumn.svelte';

  type Props = {
    tree: FSNode;
    initialSelection?: string | null;
    view: 'columns' | 'list';
    active?: boolean;
    // Navigation contract with Desktop: when `navigateTo` changes to a non-null
    // path (e.g. the user picks a folder from the menu bar), Finder adopts it as
    // its selection and calls `onnavigated()` so Desktop can clear the signal.
    navigateTo?: string | null;
    onopen: (path: string) => void;
    onnavigated?: () => void;
  };

  let {
    tree,
    initialSelection = null,
    view,
    active = false,
    navigateTo = null,
    onopen,
    onnavigated,
  }: Props = $props();

  // initialSelection seeds the selection only once; live changes come via
  // `navigateTo` below, so capturing just the initial value here is intended.
  // svelte-ignore state_referenced_locally
  let selectedPath = $state<string | null>(initialSelection ?? null);

  // Adopt an externally requested selection (from Desktop.openPath), then clear.
  // Always call onnavigated() when navigateTo is non-null so Desktop can reset
  // the signal to null — even when the path equals the current selection.
  // Avoid writing selectedPath when unchanged to stay loop-safe.
  $effect(() => {
    if (navigateTo != null) {
      if (navigateTo !== selectedPath) selectedPath = navigateTo;
      onnavigated?.();
    }
  });

  // ---- path helpers ----------------------------------------------------

  /** Parent path of a node path ('/projects/x' -> '/projects', '/x' -> '/'). */
  function parentPath(path: string): string | null {
    if (path === '/') return null;
    const idx = path.lastIndexOf('/');
    return idx <= 0 ? '/' : path.slice(0, idx);
  }

  /** Ancestor chain of nodes from root down to (and including) `path`. */
  function chainOf(path: string | null): FSNode[] {
    if (path == null) return [tree];
    const paths: string[] = [];
    let p: string | null = path;
    while (p != null) {
      paths.unshift(p);
      p = parentPath(p);
    }
    return paths
      .map((pp) => findNode(tree, pp))
      .filter((n): n is FSNode => n != null);
  }

  const selectedNode = $derived(
    selectedPath ? findNode(tree, selectedPath) : null
  );

  const chain = $derived(chainOf(selectedPath));

  /**
   * Folder nodes whose children each get a column (left to right).
   * Root is always present. Any folder in the selection chain adds a column.
   */
  const folderColumns = $derived(
    chain.filter((n, i) => i === 0 || n.children != null)
  );

  // Show a preview pane when the selected node is a file (no children).
  const showPreview = $derived(
    selectedNode != null && selectedNode.children == null
  );

  // Path bar segments: root down to the selected node.
  const breadcrumb = $derived(chain);

  // ---- selection / navigation -----------------------------------------

  function select(node: FSNode) {
    selectedPath = node.path;
  }

  function activate(node: FSNode) {
    // Double click / Enter: files with an open spec launch; folders descend.
    if (node.open) {
      onopen(node.path);
    } else if (node.children) {
      selectedPath = node.path;
    }
  }

  /** Children of a folder node (empty array if none). */
  function childrenOf(node: FSNode): FSNode[] {
    return node.children ?? [];
  }

  // ---- column auto-scroll ----------------------------------------------

  let scroller = $state<HTMLDivElement | null>(null);
  let prevColCount = 0;

  const reduceMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  // When columns grow (deeper selection), scroll fully right.
  $effect(() => {
    const count = folderColumns.length + (showPreview ? 1 : 0);
    if (view === 'columns' && count > prevColCount && scroller) {
      const el = scroller;
      tick().then(() => {
        // scrollTo is absent in jsdom; guard so tests/SSR don't throw.
        if (typeof el.scrollTo === 'function') {
          el.scrollTo({
            left: el.scrollWidth,
            behavior: reduceMotion?.matches ? 'auto' : 'smooth',
          });
        }
      });
    }
    prevColCount = count;
  });

  // ---- list view sorting -----------------------------------------------

  type SortKey = 'name' | 'date' | 'kind';
  let sortKey = $state<SortKey>('name');
  let sortAsc = $state(true);

  // The folder shown in list view: deepest folder in the selection chain.
  const listFolder = $derived(
    [...chain].reverse().find((n) => n.children != null) ?? tree
  );

  const listRows = $derived.by(() => {
    const rows = [...childrenOf(listFolder)];
    const dir = sortAsc ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name);
      if (sortKey === 'kind') return dir * a.kind.localeCompare(b.kind);
      // date
      const da = a.created ?? '';
      const db = b.created ?? '';
      return dir * da.localeCompare(db);
    });
    return rows;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = true;
    }
  }

  // ---- keyboard navigation ---------------------------------------------

  /** The column (list of nodes) that currently holds the selection. */
  function activeColumnNodes(): FSNode[] {
    if (view === 'list') return listRows;
    // In column view, the selection lives in its parent folder's column.
    const parent = selectedPath ? parentPath(selectedPath) : null;
    const parentNode = parent ? findNode(tree, parent) : tree;
    return childrenOf(parentNode ?? tree);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active) return;
    const nodes = activeColumnNodes();
    if (nodes.length === 0 && e.key !== 'ArrowLeft') return;

    const idx = nodes.findIndex((n) => n.path === selectedPath);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = idx < 0 ? 0 : Math.min(idx + 1, nodes.length - 1);
        if (nodes[next]) selectedPath = nodes[next].path;
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = idx < 0 ? 0 : Math.max(idx - 1, 0);
        if (nodes[prev]) selectedPath = nodes[prev].path;
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (view === 'columns' && selectedNode?.children?.length) {
          selectedPath = selectedNode.children[0].path;
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (view === 'columns' && selectedPath) {
          const parent = parentPath(selectedPath);
          if (parent && parent !== '/') selectedPath = parent;
          else if (parent === '/') selectedPath = null;
        }
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (selectedNode) activate(selectedNode);
        break;
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="finder" tabindex="-1">
  {#if view === 'columns'}
    <div class="columns" bind:this={scroller}>
      {#each folderColumns as folder (folder.path)}
        <div class="column" role="listbox" tabindex="-1" aria-label={folder.name}>
          {#each childrenOf(folder) as node (node.path)}
            {@const isSelected = node.path === selectedPath}
            {@const isAncestor =
              !isSelected && chain.some((c) => c.path === node.path)}
            <button
              type="button"
              class="row"
              class:selected={isSelected}
              class:ancestor={isAncestor}
              role="option"
              aria-selected={isSelected}
              tabindex="-1"
              onclick={() => select(node)}
              ondblclick={() => activate(node)}
            >
              <Icon
                kind={node.icon as 'folder' | 'doc' | 'app' | 'image'}
                size={16}
                thumb={node.previewImage ?? null}
              />
              <span class="label">{node.name}</span>
              {#if node.children}<span class="chevron">›</span>{/if}
            </button>
          {/each}
        </div>
      {/each}

      {#if showPreview && selectedNode}
        <div class="preview-col">
          <PreviewColumn node={selectedNode} {onopen} />
        </div>
      {/if}
    </div>
  {:else}
    <div class="list">
      <table>
        <thead>
          <tr>
            <th class="col-name" onclick={() => toggleSort('name')}>
              Name{sortKey === 'name' ? (sortAsc ? ' ▲' : ' ▼') : ''}
            </th>
            <th class="col-date" onclick={() => toggleSort('date')}>
              Date Created{sortKey === 'date' ? (sortAsc ? ' ▲' : ' ▼') : ''}
            </th>
            <th class="col-kind" onclick={() => toggleSort('kind')}>
              Kind{sortKey === 'kind' ? (sortAsc ? ' ▲' : ' ▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each listRows as node (node.path)}
            <tr
              class="list-row"
              class:selected={node.path === selectedPath}
              onclick={() => select(node)}
              ondblclick={() => activate(node)}
            >
              <td class="col-name">
                <Icon
                  kind={node.icon as 'folder' | 'doc' | 'app' | 'image'}
                  size={16}
                  thumb={node.previewImage ?? null}
                />
                <span class="label">{node.name}</span>
              </td>
              <td class="col-date">{node.created ? formatDate(node.created) : '—'}</td>
              <td class="col-kind">{node.kind}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <nav class="pathbar" aria-label="Path">
    {#each breadcrumb as node, i (node.path)}
      {#if i > 0}<span class="sep">▸</span>{/if}
      <button type="button" class="crumb" onclick={() => select(node)}>
        {node.name}
      </button>
    {/each}
  </nav>
</div>

<style>
  .finder {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg);
    font-family: var(--chrome-font);
    outline: none; /* suppress default; use :focus-visible below */
  }

  .finder:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  /* ---- column view ---- */
  .columns {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .column {
    flex: 0 0 200px;
    width: 200px;
    height: 100%;
    overflow-y: auto;
    border-right: 0.5px solid var(--hairline);
    padding: 4px 0;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 22px;
    padding: 0 6px 0 8px;
    text-align: left;
    color: var(--text);
    line-height: 22px;
  }

  .row .label {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 12.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row .chevron {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1;
  }

  /* macOS two-tone selection */
  .row.ancestor {
    background: rgba(0, 0, 0, 0.08);
  }

  .row.selected {
    background: var(--accent);
    color: #fff;
  }

  .row.selected .chevron {
    color: rgba(255, 255, 255, 0.85);
  }

  .preview-col {
    flex: 0 0 240px;
    width: 240px;
    height: 100%;
    border-right: 0.5px solid var(--hairline);
  }

  /* ---- list view ---- */
  .list {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--win-bg);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-dim);
    text-align: left;
    padding: 4px 8px;
    border-bottom: 0.5px solid var(--hairline);
    user-select: none;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-date {
    width: 130px;
  }
  .col-kind {
    width: 130px;
  }

  tbody tr {
    height: 22px;
  }

  tbody tr:nth-child(even) {
    background: rgba(0, 0, 0, 0.025);
  }

  tbody tr.selected {
    background: var(--accent);
    color: #fff;
  }

  td {
    font-size: 12.5px;
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  td.col-name {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 22px;
  }

  td.col-name .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---- path bar ---- */
  .pathbar {
    flex: 0 0 24px;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 10px;
    border-top: 0.5px solid var(--hairline);
    font-size: 11px;
    color: var(--text-dim);
    overflow: hidden;
    white-space: nowrap;
  }

  .crumb {
    font-size: 11px;
    color: var(--text-dim);
  }

  .crumb:hover {
    color: var(--text);
  }

  .sep {
    color: var(--text-dim);
    opacity: 0.7;
  }
</style>
