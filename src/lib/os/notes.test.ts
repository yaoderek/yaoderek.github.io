import { describe, it, expect } from 'vitest';
import { noteList, noteAt, noteOrFirst } from './notes';
import type { FSNode, NoteItem } from './types';

function note(id: string, created: string, pinned?: boolean): NoteItem {
  return {
    id,
    path: id === 'intro' ? '/intro' : `/writing/${id}`,
    title: id,
    created,
    html: `<p>${id}</p>`,
    snippet: id,
    ...(pinned ? { pinned: true } : {}),
  };
}

function noteNode(item: NoteItem, hidden = false): FSNode {
  return {
    name: `${item.id}.txt`,
    path: item.path,
    kind: 'Plain Text',
    icon: 'doc',
    ...(hidden ? { hidden: true } : {}),
    open: { app: 'notes', props: { note: item } },
  };
}

/**
 * A tree shaped like the real one: the introduction at the root, hidden from
 * the Finder, and the essays under /writing.
 */
function tree(items: NoteItem[]): FSNode {
  const [intro, ...writing] = items;
  return {
    name: "derek's mac",
    path: '/',
    kind: 'Folder',
    icon: 'folder',
    children: [
      noteNode(intro, /* hidden */ true),
      {
        name: 'writing',
        path: '/writing',
        kind: 'Folder',
        icon: 'folder',
        children: writing.map((item) => noteNode(item)),
      },
      // A folder of pictures: not notes, and must not end up in the list.
      {
        name: 'life',
        path: '/life',
        kind: 'Folder',
        icon: 'folder',
        open: { app: 'photos', props: { album: 'life', items: [] } },
        children: [
          {
            name: 'bowser.png',
            path: '/life/bowser',
            kind: 'PNG image',
            icon: 'image',
            open: { app: 'photos', props: { album: 'life', index: 0 } },
          },
        ],
      },
    ],
  };
}

const intro = note('intro', '2020-01-01', true);
const older = note('older', '2024-03-15');
const newer = note('newer', '2026-05-01');

describe('noteList', () => {
  it('gathers notes from anywhere in the tree, hidden nodes included', () => {
    const ids = noteList(tree([intro, older, newer])).map((n) => n.id);
    // The introduction is hidden from the Finder but is still a note.
    expect(ids).toContain('intro');
    expect(ids).toContain('older');
    expect(ids).toContain('newer');
  });

  it('leaves out everything that is not a note', () => {
    const paths = noteList(tree([intro, older])).map((n) => n.path);
    expect(paths).not.toContain('/life/bowser');
    expect(paths).toHaveLength(2);
  });

  it('pins the intro first even though it is the oldest', () => {
    const ids = noteList(tree([intro, older, newer])).map((n) => n.id);
    expect(ids[0]).toBe('intro');
  });

  it('orders the rest newest first', () => {
    const ids = noteList(tree([intro, older, newer])).map((n) => n.id);
    expect(ids.slice(1)).toEqual(['newer', 'older']);
  });

  it('returns an empty list for a tree with no notes', () => {
    const bare: FSNode = {
      name: "derek's mac",
      path: '/',
      kind: 'Folder',
      icon: 'folder',
      children: [],
    };
    expect(noteList(bare)).toEqual([]);
  });
});

describe('noteAt', () => {
  const notes = noteList(tree([intro, older, newer]));

  it('finds a note by id', () => {
    expect(noteAt(notes, 'older')?.title).toBe('older');
  });

  it('returns null for an unknown id', () => {
    expect(noteAt(notes, 'nope')).toBeNull();
  });

  it('returns null for a null id', () => {
    expect(noteAt(notes, null)).toBeNull();
  });
});

describe('noteOrFirst', () => {
  const notes = noteList(tree([intro, older, newer]));

  it('falls back to the first note when the id is unknown', () => {
    expect(noteOrFirst(notes, 'nope')?.id).toBe('intro');
  });

  it('falls back to the first note when no id is given', () => {
    expect(noteOrFirst(notes, null)?.id).toBe('intro');
  });

  it('still prefers the requested note', () => {
    expect(noteOrFirst(notes, 'newer')?.id).toBe('newer');
  });

  it('returns null when there are no notes at all', () => {
    expect(noteOrFirst([], 'intro')).toBeNull();
  });
});
