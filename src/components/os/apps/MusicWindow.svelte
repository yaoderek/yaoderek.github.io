<script lang="ts">
  type Props = {
    /** Phone layout: just the player, no sidebar. */
    compact?: boolean;
  };

  let { compact = false }: Props = $props();

  // Derek's playlist, played through Spotify's embed: 30-second previews for
  // visitors who aren't signed in to Spotify, whole songs for those who are.
  const PLAYLIST = { id: '3aUJ6pw0ZNxKKChmOABrU2', name: 'writing' };
  const embedUrl = `https://open.spotify.com/embed/playlist/${PLAYLIST.id}?utm_source=generator`;
  const openUrl = `https://open.spotify.com/playlist/${PLAYLIST.id}`;

  let loaded = $state(false);
</script>

<div class="music" class:compact>
  {#if !compact}
    <nav class="sidebar" aria-label="Library">
      <p class="section">Playlists</p>
      <ul>
        <li>
          <span class="item selected" aria-current="page">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2 3.5h8M2 7h8M2 10.5h5M12.5 3v7.6a1.9 1.9 0 1 1-1.2-1.8V3h3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {PLAYLIST.name}
          </span>
        </li>
      </ul>
      <a class="open" href={openUrl} target="_blank" rel="noopener">Open in Spotify ↗</a>
    </nav>
  {/if}

  <div class="player">
    {#if !loaded}
      <p class="loading">Loading…</p>
    {/if}
    <iframe
      title={`Spotify playlist: ${PLAYLIST.name}`}
      src={embedUrl}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      class:ready={loaded}
      onload={() => (loaded = true)}
    ></iframe>
  </div>
</div>

<style>
  .music {
    display: flex;
    height: 100%;
    background: var(--paper);
    color: var(--text);
    font-size: 13px;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    width: 200px;
    flex-shrink: 0;
    padding: 14px 10px;
    background: var(--cal-sidebar);
    border-right: 0.5px solid var(--hairline);
  }

  .section {
    margin: 4px 8px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
  }

  .item svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    /* Apple Music's red. */
    color: #fa2d48;
  }

  .item.selected {
    background: var(--hover-dim);
    font-weight: 500;
  }

  .open {
    margin-top: auto;
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text-dim);
    text-decoration: none;
  }

  .open:hover {
    color: var(--text);
  }

  .player {
    position: relative;
    flex: 1;
    min-width: 0;
    padding: 16px;
  }

  .compact .player {
    padding: 10px;
  }

  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    color: var(--text-dim);
  }

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 12px;
    opacity: 0;
    transition: opacity 200ms ease;
  }

  iframe.ready {
    opacity: 1;
  }
</style>
