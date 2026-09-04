<script lang="ts">
  import Icon from './Icon.svelte';

  /**
   * A file sitting on the desktop, the way a downloaded PDF does on a Mac:
   * one click selects it, a double click (or Enter) opens it.
   */
  type Props = {
    name: string;
    /** The icon macOS would give the file. Falls back to a plain document. */
    iconUrl?: string | null;
    onopen: () => void;
  };

  let { name, iconUrl = null, onopen }: Props = $props();

  let selected = $state(false);

  // Enter opens rather than selects, and preventDefault stops the browser
  // turning the keypress into the click that would only select.
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    onopen();
  }
</script>

<button
  class="file"
  class:selected
  type="button"
  onclick={() => (selected = true)}
  ondblclick={onopen}
  onblur={() => (selected = false)}
  onkeydown={onKeydown}
>
  <span class="art">
    {#if iconUrl}
      <img src={iconUrl} alt="" />
    {:else}
      <Icon kind="doc" size={52} />
    {/if}
  </span>
  <span class="label">{name}</span>
</button>

<style>
  .file {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    width: 84px;
    padding: 4px 2px 3px;
    border-radius: 6px;
    font-family: var(--chrome-font);
  }

  .art {
    display: block;
    width: 52px;
    height: 52px;
    /* The wallpaper is unpredictable, so the icon carries its own shadow. */
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
  }

  .art img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .label {
    max-width: 100%;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 15px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file.selected .art {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 6px;
  }

  .file.selected .label {
    background: var(--accent);
    text-shadow: none;
  }

  .file:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 1px;
  }
</style>
