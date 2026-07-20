<script lang="ts">
  import Icon from '../Icon.svelte';

  const files = [
    { name: 'tabs-based-navigation.fig', kind: 'Figma design', modified: 'long ago' },
    { name: 'old-portfolio-v1.html', kind: 'HTML document', modified: '2025' },
  ];

  let shaking = $state(false);

  function emptyTrash() {
    // The joke: you can't delete your past. Just a shake, nothing removed.
    shaking = false;
    // Force a reflow so re-adding the class always retriggers the animation.
    requestAnimationFrame(() => (shaking = true));
  }
</script>

<div class="trash">
  <div class="content" class:shaking>
    <div class="list" role="list">
      {#each files as file (file.name)}
        <div class="row" role="listitem">
          <span class="icon"><Icon kind="doc" size={16} /></span>
          <span class="name">{file.name}</span>
          <span class="kind">{file.kind}</span>
          <span class="modified">{file.modified}</span>
        </div>
      {/each}
    </div>
  </div>

  <footer class="footer">
    <button class="empty-btn" type="button" onclick={emptyTrash}>Empty Trash</button>
  </footer>
</div>

<style>
  .trash {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--win-bg);
    font-family: var(--chrome-font);
  }

  .content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 0;
  }

  .list {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 26px;
    padding: 0 14px;
    font-size: 12.5px;
    color: var(--text-dim);
  }

  .row:nth-child(even) {
    background: rgba(0, 0, 0, 0.025);
  }

  .icon {
    flex: 0 0 auto;
    display: flex;
    filter: grayscale(1);
    opacity: 0.7;
  }

  .name {
    flex: 1 1 auto;
    min-width: 0;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kind {
    flex: 0 0 auto;
    width: 110px;
  }

  .modified {
    flex: 0 0 auto;
    width: 72px;
    text-align: right;
  }

  .footer {
    flex: 0 0 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 12px;
    border-top: 0.5px solid var(--hairline);
  }

  .empty-btn {
    font-size: 11px;
    line-height: 1;
    padding: 5px 10px;
    border: 0.5px solid var(--hairline);
    border-radius: 4px;
    color: var(--text);
    transition:
      border-color 100ms ease,
      color 100ms ease;
  }

  .empty-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  @media (prefers-reduced-motion: no-preference) {
    .content.shaking {
      animation: trash-shake 300ms ease-in-out;
    }

    @keyframes trash-shake {
      0%,
      100% {
        transform: translateX(0);
      }
      20% {
        transform: translateX(-4px);
      }
      40% {
        transform: translateX(4px);
      }
      60% {
        transform: translateX(-4px);
      }
      80% {
        transform: translateX(4px);
      }
    }
  }
</style>
