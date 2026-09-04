<script lang="ts">
  import type { FSNode, IconKind, NoteItem } from '../../lib/os/types';
  import Icon from './Icon.svelte';
  import InlineDoc from './InlineDoc.svelte';

  type Props = {
    node: FSNode;
    onopen: (path: string) => void;
  };

  let { node, onopen }: Props = $props();

  const iconKind = $derived(node.icon as IconKind);
</script>

{#if node.open?.app === 'notes'}
  {@const note = node.open.props.note as NoteItem}
  <!-- Notes still read inline here, so browsing the Finder shows the writing
       without a window. Opening one hands it to the Notes app. -->
  <div class="note-preview">
    <div class="note-bar">
      <button class="open-in" onclick={() => onopen(node.path)}>
        Open in Notes
      </button>
    </div>
    <div class="note-body">
      <InlineDoc
        title={note?.title ?? node.name}
        html={note?.html ?? ''}
        created={note?.created ?? node.created ?? null}
      />
    </div>
  </div>
{:else}
  <div class="preview">
    <div class="visual">
      {#if node.previewImage}
        <img class="thumb" src={node.previewImage} alt="" />
      {:else}
        <Icon kind={iconKind} size={48} thumb={node.previewImage ?? null} />
      {/if}
    </div>

    <div class="name">{node.name}</div>

    {#if node.meta && node.meta.length > 0}
      <dl class="meta">
        {#each node.meta as [label, value] (label)}
          <dt>{label}</dt>
          <dd>{value}</dd>
        {/each}
      </dl>
    {/if}

    {#if node.blurb}
      <p class="blurb">{node.blurb}</p>
    {/if}

    {#if node.open?.app === 'photos'}
      <button class="open" onclick={() => onopen(node.path)}>
        Open in Photos
      </button>
    {:else if node.open?.app === 'calendar'}
      <button class="open" onclick={() => onopen(node.path)}>
        Open in Calendar
      </button>
    {/if}
  </div>
{/if}

<style>
  .preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px 20px;
    height: 100%;
    overflow-y: auto;
  }

  .visual {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    margin-top: 2%;
    align-self: stretch;
  }

  /* Preview scales with the pane now that it fills the remaining width. */
  .thumb {
    max-width: min(78%, 480px);
    max-height: 300px;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    color: var(--text);
    word-break: break-word;
    line-height: 1.3;
  }

  .meta {
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 8px;
    row-gap: 3px;
    margin: 0;
    align-self: center;
    max-width: 100%;
  }

  .meta dt {
    font-size: 11px;
    text-align: right;
    color: var(--text-dim);
  }

  .meta dd {
    font-size: 11px;
    text-align: left;
    margin: 0;
    color: var(--text);
    word-break: break-word;
  }

  .blurb {
    font-family: var(--serif-font);
    font-size: 12px;
    font-style: italic;
    color: var(--text-dim);
    text-align: left;
    line-height: 1.45;
    margin: 2px 0 0;
    padding: 0 4px;
    max-width: 380px;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .open {
    margin-top: 2px;
    font-size: 12px;
    color: var(--accent);
    padding: 2px 10px;
  }

  .open:hover {
    text-decoration: underline;
  }

  /* Inline note preview: a thin bar above the reading pane, so the Finder
     hands the note off to Notes without the reader guessing at a double-click. */
  .note-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--paper);
  }

  .note-bar {
    flex: 0 0 auto;
    display: flex;
    justify-content: flex-end;
    padding: 6px 10px 0;
  }

  .note-body {
    flex: 1 1 auto;
    min-height: 0;
  }

  .open-in {
    font-size: 11.5px;
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 5px;
  }

  .open-in:hover {
    background: var(--hover-dim);
  }

  .open-in:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
