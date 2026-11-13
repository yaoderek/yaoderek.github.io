import type { PhotoItem, Place } from './types';

/** A picture on the map, with its index in the album so Photos can open it. */
export type MapPin = {
  id: string;
  index: number;
  title: string;
  created: string;
  imageUrl: string;
  place: Place;
};

/** The pictures in an album that say where they were taken, in album order. */
export function mapPins(items: PhotoItem[]): MapPin[] {
  return items.flatMap((item, index) =>
    item.place
      ? [
          {
            id: item.id,
            index,
            title: item.title,
            created: item.created,
            imageUrl: item.imageUrl,
            place: item.place,
          },
        ]
      : []
  );
}

/**
 * The box around every pin, the short way round the globe. Seattle and Taipei
 * are 120° apart across the Pacific but 240° apart across the Atlantic, so the
 * box takes the widest empty stretch of longitude as the part to leave out,
 * and may run past 180° to get there (MapLibre draws world copies, so a
 * longitude of 240 is just -120 one world over).
 */
export function pinBounds(
  places: Place[]
): [[number, number], [number, number]] | null {
  if (places.length === 0) return null;
  const lngs = places.map((p) => p.lng).sort((a, b) => a - b);
  const lats = places.map((p) => p.lat);

  // The empty stretch after each longitude, wrapping from the last to the first.
  let widestGap = -1;
  let after = lngs.length - 1;
  lngs.forEach((lng, i) => {
    const next = i + 1 < lngs.length ? lngs[i + 1] : lngs[0] + 360;
    if (next - lng > widestGap) {
      widestGap = next - lng;
      after = i;
    }
  });

  // Start just past the gap and run east to its other side.
  const west = lngs[(after + 1) % lngs.length];
  const eastRaw = lngs[after];
  const east = eastRaw < west ? eastRaw + 360 : eastRaw;
  return [
    [west, Math.min(...lats)],
    [east, Math.max(...lats)],
  ];
}

// ---------------------------------------------------------------------------
// The look: OpenFreeMap's OpenMapTiles style, repainted in Apple Maps' colours.

type Palette = {
  land: string;
  relief: number;
  water: string;
  waterLabel: string;
  park: string;
  wood: string;
  grass: string;
  ice: string;
  sand: string;
  hospital: string;
  school: string;
  building: string;
  buildingEdge: string;
  minor: string;
  minorCasing: string;
  major: string;
  majorCasing: string;
  motorway: string;
  motorwayCasing: string;
  path: string;
  rail: string;
  aeroway: string;
  boundary: string;
  label: string;
  labelStrong: string;
  labelDim: string;
  halo: string;
};

const LIGHT: Palette = {
  land: '#f5f3ee',
  relief: 0.45,
  water: '#a2d3f5',
  waterLabel: '#3f73a3',
  park: '#c8e6b5',
  wood: '#cfe7c1',
  grass: '#d6ecc9',
  ice: '#f4f8fa',
  sand: '#f3ead2',
  hospital: '#f8dfe2',
  school: '#efe9d8',
  building: '#e7e4df',
  buildingEdge: '#d9d5cf',
  minor: '#ffffff',
  minorCasing: '#dcd7cf',
  major: '#fff3c4',
  majorCasing: '#e6d49c',
  motorway: '#fbd57a',
  motorwayCasing: '#e3b55a',
  path: '#ffffff',
  rail: '#cbc7c0',
  aeroway: '#e9e6f0',
  boundary: '#b7b1c4',
  label: '#3c3c3e',
  labelStrong: '#1d1d1f',
  labelDim: '#77777c',
  halo: '#ffffff',
};

const DARK: Palette = {
  land: '#2b2b2d',
  relief: 0.18,
  water: '#1c3448',
  waterLabel: '#7fa6c8',
  park: '#25392a',
  wood: '#273a2c',
  grass: '#2a3a2d',
  ice: '#34383b',
  sand: '#3a3629',
  hospital: '#3d2c30',
  school: '#363329',
  building: '#3a3a3d',
  buildingEdge: '#444448',
  minor: '#4a4a4d',
  minorCasing: '#3a3a3c',
  major: '#5e5a4a',
  majorCasing: '#4a4638',
  motorway: '#86713f',
  motorwayCasing: '#5e5030',
  path: '#454548',
  rail: '#55555a',
  aeroway: '#38363f',
  boundary: '#6f6a7c',
  label: '#d8d8dc',
  labelStrong: '#f2f2f4',
  labelDim: '#9a9aa0',
  halo: '#1c1c1e',
};

type Layer = {
  id: string;
  type: string;
  'source-layer'?: string;
  paint?: Record<string, unknown>;
  [key: string]: unknown;
};

type Style = { layers: Layer[]; [key: string]: unknown };

/** Paint for one transportation line, by which road (or casing) it draws. */
function roadPaint(id: string, c: Palette): Record<string, unknown> | null {
  const casing = id.includes('casing');
  if (id.includes('rail')) return { 'line-color': c.rail };
  if (id.includes('path_pedestrian')) {
    return casing ? { 'line-color': c.minorCasing } : { 'line-color': c.path };
  }
  if (id.includes('motorway')) {
    return { 'line-color': casing ? c.motorwayCasing : c.motorway };
  }
  if (id.includes('trunk_primary')) {
    return { 'line-color': casing ? c.majorCasing : c.major };
  }
  // Secondary, tertiary, links, streets, service roads: white, the way Apple
  // keeps everything below a primary road.
  return { 'line-color': casing ? c.minorCasing : c.minor };
}

/** Paint for one layer of the OpenMapTiles style, or null to leave it be. */
function layerPaint(layer: Layer, c: Palette): Record<string, unknown> | null {
  const { id, type } = layer;
  const sourceLayer = layer['source-layer'];

  if (type === 'background') return { 'background-color': c.land };
  if (type === 'raster') return { 'raster-opacity': c.relief };

  if (type === 'symbol') {
    const halo = { 'text-halo-color': c.halo };
    if (sourceLayer === 'water_name' || id.startsWith('waterway')) {
      return { ...halo, 'text-color': c.waterLabel };
    }
    if (/^label_(city|country)/.test(id)) return { ...halo, 'text-color': c.labelStrong };
    if (id.startsWith('label_')) return { ...halo, 'text-color': c.label };
    if (id.startsWith('poi') || id === 'airport' || id.startsWith('highway-name')) {
      return { ...halo, 'text-color': c.labelDim };
    }
    return null;
  }

  if (id === 'water') return { 'fill-color': c.water };
  if (id.startsWith('waterway')) return { 'line-color': c.water };
  if (id === 'park') return { 'fill-color': c.park, 'fill-outline-color': c.park };
  if (id === 'park_outline') return { 'line-color': c.park };
  if (id === 'landuse_residential') return { 'fill-opacity': 0 };
  if (id === 'landcover_wood') return { 'fill-color': c.wood };
  if (id === 'landcover_grass') return { 'fill-color': c.grass };
  if (id === 'landcover_ice') return { 'fill-color': c.ice };
  if (id === 'landcover_sand') return { 'fill-color': c.sand };
  if (id === 'landuse_hospital') return { 'fill-color': c.hospital };
  if (id === 'landuse_school') return { 'fill-color': c.school };
  if (/^landuse_(pitch|track|cemetery)$/.test(id)) return { 'fill-color': c.grass };
  if (id === 'aeroway_fill') return { 'fill-color': c.aeroway };
  if (id.startsWith('aeroway')) return { 'line-color': c.minor };
  if (id === 'building') {
    return { 'fill-color': c.building, 'fill-outline-color': c.buildingEdge };
  }
  if (id === 'building-3d') return { 'fill-extrusion-color': c.building };
  if (id.startsWith('boundary')) return { 'line-color': c.boundary };
  if (sourceLayer === 'transportation' && type === 'line') return roadPaint(id, c);
  return null;
}

/**
 * The style with every colour swapped for Apple Maps' palette, light or dark.
 * Returns a new style; the one passed in is left as it was, so it can be
 * repainted again when the appearance flips.
 */
export function appleMapStyle<T extends Style>(style: T, dark: boolean): T {
  const palette = dark ? DARK : LIGHT;
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const paint = layerPaint(layer, palette);
      return paint ? { ...layer, paint: { ...layer.paint, ...paint } } : layer;
    }),
  };
}
