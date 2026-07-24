/**
 * The Photos app's view of the filesystem.
 *
 * Photos shows albums rather than folders: /art and /life each become an album,
 * so the pictures live in one place instead of two look-alike gallery windows.
 * The album items are read off the folder nodes, which keeps every photo node in
 * the serialized tree down to an album id plus an index.
 */

import type { FSNode, PhotoItem } from './types';
import { findNode } from './fs';
import { MIN_W, MIN_H } from './windows';

export type PhotoAlbum = {
  id: string;
  title: string;
  items: PhotoItem[];
};

/** Albums the app shows, in order, and the folder each one is built from. */
const ALBUM_SOURCES = [
  { id: 'art', title: 'Art', path: '/art' },
  { id: 'life', title: 'Life', path: '/life' },
] as const;

/** The albums for a filesystem tree. Empty folders are left out. */
export function photoAlbums(tree: FSNode): PhotoAlbum[] {
  const albums: PhotoAlbum[] = [];
  for (const source of ALBUM_SOURCES) {
    const items = findNode(tree, source.path)?.open?.props.items as
      | PhotoItem[]
      | undefined;
    if (items && items.length > 0) {
      albums.push({ id: source.id, title: source.title, items });
    }
  }
  return albums;
}

/** The picture an album/index pair points at, if any. */
export function photoAt(
  albums: PhotoAlbum[],
  album: string | null,
  index: number | null
): PhotoItem | null {
  if (album === null || index === null) return null;
  return albums.find((a) => a.id === album)?.items[index] ?? null;
}

// Chrome the Photos window wraps the picture in: title bar, info bar,
// filmstrip, and the stage's padding. Kept in sync with PhotosWindow.svelte.
const CHROME_W = 28;
const CHROME_H = 28 + 36 + 58 + 28;

// How much of the screen a photo window may claim before it starts scaling down.
const MAX_WIDTH_FRACTION = 0.55;
const MAX_HEIGHT_FRACTION = 0.82;

/**
 * A window size that wraps a picture snugly: the stage keeps the photo's aspect
 * ratio, so it opens without empty letterboxing around the image.
 */
export function photoWindowSize(
  photo: { width: number; height: number },
  vp: { vw: number; vh: number }
): { w: number; h: number } {
  const maxStageW = vp.vw * MAX_WIDTH_FRACTION - CHROME_W;
  const maxStageH = (vp.vh - 24) * MAX_HEIGHT_FRACTION - CHROME_H;
  const scale = Math.min(
    maxStageW / photo.width,
    maxStageH / photo.height,
    1
  );
  return {
    w: Math.max(MIN_W, Math.round(photo.width * scale) + CHROME_W),
    h: Math.max(MIN_H, Math.round(photo.height * scale) + CHROME_H),
  };
}
