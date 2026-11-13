<script lang="ts">
  import { onMount } from 'svelte';
  import type { Map as MapView, StyleSpecification } from 'maplibre-gl';
  import { appleMapStyle, pinBounds, type MapPin } from '../../../lib/os/maps';
  import { formatDate } from '../../../lib/os/format';

  type Props = {
    /** The pictures that say where they were taken. */
    pins: MapPin[];
    dark?: boolean;
    reducedMotion?: boolean;
    /** Phone layout: the place list sits under the map instead of beside it. */
    compact?: boolean;
    onopenphoto?: (pin: MapPin) => void;
  };

  let { pins, dark = false, reducedMotion = false, compact = false, onopenphoto }: Props =
    $props();

  // OpenFreeMap: OpenStreetMap vector tiles, free and keyless. The style is
  // fetched once and repainted in Apple's colours (and again on a theme flip).
  const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
  // Before there are any pins to frame: the Pacific Northwest.
  const FALLBACK_CENTER: [number, number] = [-122.33, 47.61];
  // How close a picked place flies in to.
  const PLACE_ZOOM = 11;

  let container: HTMLDivElement;
  let map: MapView | null = null;
  let baseStyle: StyleSpecification | null = null;
  let paintedDark: boolean | null = null;
  const pinEls: Record<string, HTMLElement> = {};

  let status = $state<'loading' | 'ready' | 'failed'>('loading');
  let selectedId = $state<string | null>(null);
  let query = $state('');
  let threeD = $state(false);

  const selected = $derived(pins.find((pin) => pin.id === selectedId) ?? null);
  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((pin) => `${pin.place.name} ${pin.title}`.toLowerCase().includes(q));
  });

  /** The line under a place: the picture's title (unless it's just the place's
   *  name again) and the day it was taken. */
  function detail(pin: MapPin): string {
    const date = formatDate(pin.created);
    return pin.title === pin.place.name ? date : `${pin.title} · ${date}`;
  }

  function coordinates({ lat, lng }: { lat: number; lng: number }): string {
    return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${
      lng >= 0 ? 'E' : 'W'
    }`;
  }

  function select(id: string | null) {
    selectedId = id;
    const pin = pins.find((p) => p.id === id);
    if (!pin || !map) return;
    map.flyTo({
      center: [pin.place.lng, pin.place.lat],
      zoom: Math.max(map.getZoom(), PLACE_ZOOM),
      duration: reducedMotion ? 0 : 1800,
      essential: false,
    });
  }

  function toggle3D() {
    threeD = !threeD;
    map?.easeTo({ pitch: threeD ? 60 : 0, duration: reducedMotion ? 0 : 600 });
  }

  /**
   * A pin the way Photos draws a picture on its map: the photo, framed. MapLibre
   * positions the outer element with a transform, so the button inside is
   * what grows on hover.
   */
  function pinElement(pin: MapPin): { marker: HTMLElement; button: HTMLElement } {
    const marker = document.createElement('div');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'maps-pin';
    button.setAttribute('aria-label', `${pin.title}, ${pin.place.name}`);
    const img = document.createElement('img');
    img.src = pin.imageUrl;
    img.alt = '';
    img.draggable = false;
    button.append(img);
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      select(pin.id);
    });
    marker.append(button);
    return { marker, button };
  }

  // The picked place's pin stands out from the rest.
  $effect(() => {
    for (const [id, el] of Object.entries(pinEls)) {
      el.classList.toggle('selected', id === selectedId);
    }
  });

  // Repaint when the appearance flips; the pins are DOM and survive a restyle.
  $effect(() => {
    const wantDark = dark;
    if (!map || !baseStyle || paintedDark === wantDark) return;
    paintedDark = wantDark;
    map.setStyle(appleMapStyle(baseStyle, wantDark));
  });

  onMount(() => {
    let destroyed = false;
    let resizer: ResizeObserver | null = null;

    (async () => {
      // No WebGL (or a test DOM): no map, but the places list still works.
      if (typeof WebGLRenderingContext === 'undefined') {
        status = 'failed';
        return;
      }
      try {
        const [{ default: maplibregl }, style] = await Promise.all([
          import('maplibre-gl'),
          fetch(STYLE_URL).then((r) => {
            if (!r.ok) throw new Error(`style ${r.status}`);
            return r.json() as Promise<StyleSpecification>;
          }),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ]);
        if (destroyed) return;

        baseStyle = style;
        paintedDark = dark;
        const bounds = pinBounds(pins.map((pin) => pin.place));
        map = new maplibregl.Map({
          container,
          style: appleMapStyle(style, dark),
          ...(bounds
            ? { bounds, fitBoundsOptions: { padding: 70, maxZoom: PLACE_ZOOM } }
            : { center: FALLBACK_CENTER, zoom: 5 }),
          // Credit stays on screen, but small, where Apple puts its Legal link.
          attributionControl: false,
          maxPitch: 70,
        });
        map.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          'bottom-right'
        );
        map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-left');
        for (const pin of pins) {
          const { marker, button } = pinElement(pin);
          pinEls[pin.id] = button;
          new maplibregl.Marker({ element: marker, anchor: 'bottom' })
            .setLngLat([pin.place.lng, pin.place.lat])
            .addTo(map);
        }
        map.on('load', () => (status = 'ready'));

        // The window resizes without the browser window doing so, which is
        // the only resize MapLibre listens for on its own.
        resizer = new ResizeObserver(() => map?.resize());
        resizer.observe(container);
      } catch {
        if (!destroyed) status = 'failed';
      }
    })();

    return () => {
      destroyed = true;
      resizer?.disconnect();
      map?.remove();
      map = null;
    };
  });
</script>

<div class="maps" class:compact>
  <aside class="sidebar" aria-label="Places">
    <label class="search">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M10.4 10.4 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <input
        type="search"
        placeholder="Search Maps"
        aria-label="Search Maps"
        bind:value={query}
        onfocus={() => (selectedId = null)}
      />
    </label>

    {#if selected}
      <div class="card">
        <button class="back" onclick={() => (selectedId = null)}>‹ Places</button>
        <h2>{selected.place.name}</h2>
        <p class="sub">{detail(selected)}</p>
        <img src={selected.imageUrl} alt={selected.title} />
        <dl>
          <dt>Coordinates</dt>
          <dd>{coordinates(selected.place)}</dd>
        </dl>
        {#if onopenphoto}
          <button class="primary" onclick={() => onopenphoto?.(selected)}>Open in Photos</button>
        {/if}
      </div>
    {:else}
      <p class="section">Places</p>
      <ul>
        {#each shown as pin (pin.id)}
          <li>
            <button class="place" onclick={() => select(pin.id)}>
              <img src={pin.imageUrl} alt="" />
              <span class="text">
                <span class="name">{pin.place.name}</span>
                <span class="detail">{detail(pin)}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
      {#if shown.length === 0}
        <p class="empty">No Results</p>
      {/if}
    {/if}
  </aside>

  <div class="map-area">
    <div class="map" bind:this={container}></div>
    {#if status === 'ready'}
      <button
        class="three-d"
        aria-pressed={threeD}
        title={threeD ? 'Show in 2D' : 'Show in 3D'}
        onclick={toggle3D}>{threeD ? '2D' : '3D'}</button
      >
    {:else}
      <p class="map-status" aria-live="polite">
        {status === 'loading' ? 'Loading map…' : 'The map can’t load here.'}
      </p>
    {/if}
  </div>
</div>

<style>
  .maps {
    display: flex;
    height: 100%;
    background: var(--paper);
    color: var(--text);
    font-size: 13px;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    width: 280px;
    flex-shrink: 0;
    padding: 10px;
    overflow-y: auto;
    background: var(--cal-sidebar);
    border-right: 0.5px solid var(--hairline);
  }

  .search {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    margin-bottom: 10px;
    border-radius: 7px;
    background: var(--note-field);
    color: var(--text-dim);
  }

  .search svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
    font: inherit;
    color: var(--text);
  }

  .section {
    margin: 4px 6px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .place {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px;
    border-radius: 8px;
    text-align: left;
  }

  .place:hover {
    background: var(--hover-dim);
  }

  .place img {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    font-weight: 600;
  }

  .detail {
    color: var(--text-dim);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty {
    margin: 24px 0;
    text-align: center;
    color: var(--text-dim);
  }

  .card h2 {
    margin: 8px 0 2px;
    font-size: 20px;
    font-weight: 700;
  }

  .card .sub {
    margin: 0 0 10px;
    color: var(--text-dim);
  }

  .card img {
    width: 100%;
    max-height: 220px;
    object-fit: cover;
    border-radius: 10px;
  }

  .card dl {
    margin: 10px 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--paper);
  }

  .card dt {
    font-size: 11px;
    color: var(--text-dim);
  }

  .card dd {
    margin: 2px 0 0;
  }

  .back {
    color: var(--accent);
    font-size: 13px;
  }

  .primary {
    width: 100%;
    padding: 7px;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-weight: 500;
  }

  .map-area {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .map {
    position: absolute;
    inset: 0;
    background: #f5f3ee;
  }

  :global(.theme-dark) .map {
    background: #2b2b2d;
  }

  .map-status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    color: var(--text-dim);
    pointer-events: none;
  }

  /* Apple's 3D button, top right of the map. */
  .three-d {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: var(--menu-bg);
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(12px);
  }

  .three-d[aria-pressed='true'] {
    color: var(--accent);
  }

  /* Pins are made outside Svelte (MapLibre places them), so global styles. */
  .maps :global(.maps-pin) {
    position: relative;
    display: block;
    width: 44px;
    height: 44px;
    padding: 2px;
    border-radius: 9px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    cursor: pointer;
    transition: transform 160ms ease;
    transform-origin: bottom center;
  }

  /* The little point under the frame, down onto the spot. */
  .maps :global(.maps-pin)::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -6px;
    margin-left: -6px;
    border: 6px solid transparent;
    border-bottom: 0;
    border-top-color: #fff;
  }

  .maps :global(.maps-pin img) {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 7px;
    object-fit: cover;
  }

  .maps :global(.maps-pin.selected),
  .maps :global(.maps-pin:hover) {
    transform: scale(1.25);
    z-index: 1;
  }

  /* MapLibre's zoom and compass buttons, in Apple's frosted style. */
  .maps :global(.maplibregl-ctrl-group) {
    border-radius: 8px;
    background: var(--menu-bg);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(12px);
  }

  :global(.theme-dark) .maps :global(.maplibregl-ctrl-group button .maplibregl-ctrl-icon) {
    filter: invert(1);
  }

  .maps :global(.maplibregl-ctrl-attrib) {
    padding: 0 4px;
    border-radius: 4px;
    background: transparent;
    font-size: 9px;
    color: var(--text-dim);
  }

  .maps :global(.maplibregl-ctrl-attrib a) {
    color: inherit;
  }

  .compact {
    flex-direction: column-reverse;
  }

  .compact .sidebar {
    width: auto;
    max-height: 42%;
    border-right: 0;
    border-top: 0.5px solid var(--hairline);
  }

  .compact .map-area {
    flex: 1;
    min-height: 0;
  }
</style>
