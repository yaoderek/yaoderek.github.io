import { describe, expect, test } from 'vitest';
import { appleMapStyle, mapPins, pinBounds } from './maps';
import type { PhotoItem } from './types';

const photo = (id: string, place?: PhotoItem['place']): PhotoItem => ({
  id,
  title: id,
  created: '2026-01-01',
  medium: 'photo',
  imageUrl: `/${id}.webp`,
  width: 100,
  height: 100,
  ...(place ? { place } : {}),
});

const TAIPEI = { name: 'Taipei', lat: 25.05, lng: 121.52 };
const GRANITE = { name: 'Granite Mountain', lat: 47.42, lng: -121.48 };
const EL_CAP = { name: 'El Capitan', lat: 37.73, lng: -119.64 };

describe('mapPins', () => {
  test('keeps only pictures with a place, with their album index', () => {
    const pins = mapPins([photo('a', TAIPEI), photo('b'), photo('c', GRANITE)]);
    expect(pins.map((p) => [p.id, p.index])).toEqual([
      ['a', 0],
      ['c', 2],
    ]);
  });
});

describe('mapPins thumbnails', () => {
  test('draws the small picture, and the full one when there is no small one', () => {
    const small = { ...photo('a', TAIPEI), thumbUrl: '/a-thumb.webp' };
    const pins = mapPins([small, photo('b', GRANITE)]);
    expect(pins.map((p) => p.thumbUrl)).toEqual(['/a-thumb.webp', '/b.webp']);
    expect(pins.map((p) => p.imageUrl)).toEqual(['/a.webp', '/b.webp']);
  });
});

describe('pinBounds', () => {
  test('is null with nothing to show', () => {
    expect(pinBounds([])).toBeNull();
  });

  test('spans the Pacific rather than the long way round', () => {
    const [[west, south], [east, north]] = pinBounds([TAIPEI, GRANITE, EL_CAP])!;
    expect(west).toBe(TAIPEI.lng);
    // El Capitan, one world east, so the box crosses the date line.
    expect(east).toBeCloseTo(EL_CAP.lng + 360);
    expect(east - west).toBeLessThan(180);
    expect(south).toBe(TAIPEI.lat);
    expect(north).toBe(GRANITE.lat);
  });

  test('stays within one world when the places are close', () => {
    const [[west], [east]] = pinBounds([GRANITE, EL_CAP])!;
    expect([west, east]).toEqual([GRANITE.lng, EL_CAP.lng]);
  });

  test('a single place is a box of one point', () => {
    expect(pinBounds([TAIPEI])).toEqual([
      [TAIPEI.lng, TAIPEI.lat],
      [TAIPEI.lng, TAIPEI.lat],
    ]);
  });
});

describe('appleMapStyle', () => {
  const style = {
    version: 8,
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f8f4f0' } },
      { id: 'water', type: 'fill', 'source-layer': 'water', paint: { 'fill-color': 'blue' } },
      {
        id: 'road_motorway',
        type: 'line',
        'source-layer': 'transportation',
        paint: { 'line-color': '#fc8', 'line-width': 3 },
      },
      {
        id: 'road_motorway_casing',
        type: 'line',
        'source-layer': 'transportation',
        paint: { 'line-color': '#e9ac77' },
      },
      { id: 'label_city', type: 'symbol', 'source-layer': 'place', paint: { 'text-color': '#000' } },
      { id: 'mystery', type: 'fill', 'source-layer': 'other', paint: { 'fill-color': 'red' } },
    ],
  };

  const paint = (s: typeof style, id: string) => s.layers.find((l) => l.id === id)!.paint;

  test('repaints land, water, roads and labels, and keeps other paint', () => {
    const light = appleMapStyle(style, false);
    expect(paint(light, 'background')).toEqual({ 'background-color': '#f5f3ee' });
    expect(paint(light, 'water')).toEqual({ 'fill-color': '#a2d3f5' });
    // Colour swapped, width kept.
    expect(paint(light, 'road_motorway')).toEqual({ 'line-color': '#fbd57a', 'line-width': 3 });
    expect(paint(light, 'road_motorway_casing')).toEqual({ 'line-color': '#e3b55a' });
    expect(paint(light, 'label_city')).toMatchObject({ 'text-color': '#1d1d1f' });
    expect(paint(light, 'mystery')).toEqual({ 'fill-color': 'red' });
  });

  test('dark is a different palette, and the original style is untouched', () => {
    const dark = appleMapStyle(style, true);
    expect(paint(dark, 'background')).toEqual({ 'background-color': '#2b2b2d' });
    expect(paint(style, 'background')).toEqual({ 'background-color': '#f8f4f0' });
  });
});

describe('what appleMapStyle leaves out, for speed', () => {
  const bilingual = [
    'case',
    ['has', 'name:nonlatin'],
    ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
    ['coalesce', ['get', 'name_en'], ['get', 'name']],
  ];
  const shield = ['to-string', ['get', 'ref']];
  const style = {
    version: 8,
    sources: {
      relief: { type: 'raster', tileSize: 256, tiles: ['/{z}/{x}/{y}.png'] },
      streets: { type: 'vector', url: '/planet' },
    },
    layers: [
      { id: 'natural_earth', type: 'raster', source: 'relief' },
      { id: 'landuse_residential', type: 'fill', source: 'streets', 'source-layer': 'landuse' },
      {
        id: 'label_city',
        type: 'symbol',
        source: 'streets',
        'source-layer': 'place',
        layout: { 'text-field': bilingual, 'text-size': 12 },
      },
      {
        id: 'road_shield_us',
        type: 'symbol',
        source: 'streets',
        'source-layer': 'transportation_name',
        layout: { 'text-field': shield },
      },
    ],
  };
  const out = appleMapStyle(style, false);
  const layer = (id: string) => out.layers.find((l) => l.id === id);

  test('names are in English only from afar, and in both languages up close', () => {
    const { 'text-field': field, ...rest } = layer('label_city')!.layout as Record<string, any>;
    expect(field.slice(0, 2)).toEqual(['step', ['zoom']]);
    expect(JSON.stringify(field[2])).not.toContain('nonlatin');
    expect(field[4]).toBe(bilingual);
    expect(rest).toEqual({ 'text-size': 12 });
    // Highway numbers aren't names.
    expect(layer('road_shield_us')!.layout).toEqual({ 'text-field': shield });
  });

  test('the relief is drawn from fewer tiles, without a crossfade', () => {
    expect(out.sources.relief).toMatchObject({ tileSize: 512 });
    expect(layer('natural_earth')).toHaveProperty('paint', expect.objectContaining({ 'raster-fade-duration': 0 }));
    expect(out.sources.streets).toEqual(style.sources.streets);
  });

  test('the invisible residential layer is gone', () => {
    expect(layer('landuse_residential')).toBeUndefined();
  });

  test('the style passed in is untouched', () => {
    expect(style.layers).toHaveLength(4);
    expect(style.sources.relief.tileSize).toBe(256);
    expect(style.layers[2].layout!['text-field']).toBe(bilingual);
  });
});
