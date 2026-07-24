import { describe, it, expect } from 'vitest';
import { photoAlbums, photoAt, photoWindowSize } from './photos';
import { MIN_W, MIN_H } from './windows';
import type { FSNode, PhotoItem } from './types';

const portrait: PhotoItem = {
  id: 'pier-at-night',
  title: 'Pier at night',
  created: '2025-09-27',
  medium: 'photo',
  imageUrl: '/images/pier-at-night.webp',
  width: 768,
  height: 1024,
};

const drawing: PhotoItem = {
  id: 'poseidon',
  title: 'Poseidon',
  created: '2025-01-01',
  medium: 'graphite on paper',
  imageUrl: '/images/poseidon.webp',
  width: 1200,
  height: 1600,
};

function tree(art: PhotoItem[], life: PhotoItem[]): FSNode {
  const folder = (album: string, items: PhotoItem[]): FSNode => ({
    name: album,
    path: `/${album}`,
    kind: 'Folder',
    icon: 'folder',
    open: { app: 'photos', props: { album, items } },
  });
  return {
    name: "derek's mac",
    path: '/',
    kind: 'Folder',
    icon: 'folder',
    children: [folder('art', art), folder('life', life)],
  };
}

describe('photoAlbums', () => {
  it('builds Art then Life from the picture folders', () => {
    const albums = photoAlbums(tree([drawing], [portrait]));
    expect(albums.map((a) => a.id)).toEqual(['art', 'life']);
    expect(albums.map((a) => a.title)).toEqual(['Art', 'Life']);
    expect(albums[1].items).toEqual([portrait]);
  });

  it('leaves out folders with no pictures', () => {
    expect(photoAlbums(tree([], [portrait])).map((a) => a.id)).toEqual(['life']);
  });

  it('returns nothing for a tree without picture folders', () => {
    const bare: FSNode = { name: 'root', path: '/', kind: 'Folder', icon: 'folder' };
    expect(photoAlbums(bare)).toEqual([]);
  });
});

describe('photoAt', () => {
  const albums = photoAlbums(tree([drawing], [portrait]));

  it('finds a picture by album and index', () => {
    expect(photoAt(albums, 'life', 0)).toEqual(portrait);
  });

  it('returns null without a target, or for an unknown album/index', () => {
    expect(photoAt(albums, 'life', null)).toBeNull();
    expect(photoAt(albums, null, 0)).toBeNull();
    expect(photoAt(albums, 'nope', 0)).toBeNull();
    expect(photoAt(albums, 'life', 9)).toBeNull();
  });
});

describe('photoWindowSize', () => {
  const vp = { vw: 1440, vh: 900 };

  it('keeps the picture\'s aspect ratio inside the chrome', () => {
    const { w, h } = photoWindowSize(portrait, vp);
    // The stage is the window minus the chrome: 28px of padding across, and
    // 150px of title bar + info bar + filmstrip + padding down.
    const stageRatio = (w - 28) / (h - 150);
    expect(stageRatio).toBeCloseTo(portrait.width / portrait.height, 1);
    expect(h).toBeGreaterThan(w);
  });

  it('fits within the screen, menu bar included', () => {
    const { w, h } = photoWindowSize(portrait, vp);
    expect(w).toBeLessThan(vp.vw);
    expect(h).toBeLessThan(vp.vh - 24);
  });

  it('never opens smaller than a usable window', () => {
    const sliver = { width: 200, height: 2000 };
    const { w, h } = photoWindowSize(sliver, { vw: 600, vh: 500 });
    expect(w).toBeGreaterThanOrEqual(MIN_W);
    expect(h).toBeGreaterThanOrEqual(MIN_H);
  });

  it('does not blow a small picture up past its own size', () => {
    const { w, h } = photoWindowSize({ width: 240, height: 180 }, vp);
    expect(w).toBe(Math.max(MIN_W, 240 + 28));
    expect(h).toBe(180 + 150);
  });
});
