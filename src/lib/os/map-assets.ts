import type { StyleSpecification } from 'maplibre-gl';

// OpenFreeMap: OpenStreetMap vector tiles, free and keyless.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// Where the tiles are this week. The style points here, so MapLibre would only
// ask for it once the style is down.
const TILES_URL = 'https://tiles.openfreemap.org/planet';

/** Whether a map can be drawn at all: not without WebGL, nor in a test DOM. */
export const canDrawMap = () => typeof WebGLRenderingContext !== 'undefined';

/**
 * Everything the map needs before its first tile, all at once rather than one
 * after the other. Nothing is kept here: the browser's own cache answers the
 * second time, for as long as OpenFreeMap says each answer is good.
 */
export async function loadMap() {
  // Only a head start; MapLibre asks again itself, and reports it if it fails.
  fetch(TILES_URL).catch(() => {});
  const [{ default: maplibregl }, style] = await Promise.all([
    import('maplibre-gl').then((lib) => {
      // Start the workers now, and keep them for the next time Maps opens.
      lib.default.prewarm();
      return lib;
    }),
    fetch(STYLE_URL).then((r) => {
      if (!r.ok) throw new Error(`style ${r.status}`);
      return r.json() as Promise<StyleSpecification>;
    }),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);
  return { maplibregl, style };
}

let warmed = false;

/** Get a head start on opening Maps, once someone looks about to. */
export function warmMap() {
  if (warmed || !canDrawMap()) return;
  warmed = true;
  loadMap().catch(() => (warmed = false));
}
