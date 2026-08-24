import { describe, it, expect } from 'vitest';
import { noteList, noteAt, noteOrFirst } from './notes';
import type { FSNode, NoteItem } from './types';

function note(id: string, created: string, pinned?: boolean): NoteItem {
  return {
    id,
    path: id === 'readme' ? '/README.txt' : `/writing/${id}`,
    title: id,
    created,
    html: `<p>${id}</p>`,
    snippet: id,
    ...(pinned ? { pinned: true } : {}),
  };
}

function noteNode(item: NoteItem): FSNode {
  return {
    name: `${item.id}.txt`,
    path: item.path,
    kind: 'Plain Text',
    icon: 'doc',
    open: { app: 'notes', props: { note: item } },
  };
}

/** A tree shaped like the real one: README at the root, essays under /writing. */
function tree(items: NoteItem[]): FSNode {
  const [readme, ...writing] = items;
  return {
    name: "derek's mac",
    path: '/',
    kind: 'Folder',
    icon: 'folder',
    children: [
      noteNode(readme),
      {
        name: 'writing',
        path: '/writing',
        kind: 'Folder',
        icon: 'folder',
        children: writing.map(noteNode),
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

const readme = note('readme', '2020-01-01', true);
const older = note('older', '2024-03-15');
const newer = note('newer', '2026-05-01');

describe('noteList', () => {
  it('gathers notes from anywhere in the tree', () => {
    const ids = noteList(tree([readme, older, newer])).map((n) => n.id);
    expect(ids).toContain('readme');
    expect(ids).toContain('older');
    expect(ids).toContain('newer');
  });

  it('leaves out everything that is not a note', () => {
    const paths = noteList(tree([readme, older])).map((n) => n.path);
    expect(paths).not.toContain('/life/bowser');
    expect(paths).toHaveLength(2);
  });

  it('pins the README first even though it is the oldest', () => {
    const ids = noteList(tree([readme, older, newer])).map((n) => n.id);
    expect(ids[0]).toBe('readme');
  });

  it('orders the rest newest first', () => {
    const ids = noteList(tree([readme, older, newer])).map((n) => n.id);
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
  const notes = noteList(tree([readme, older, newer]));

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
  const notes = noteList(tree([readme, older, newer]));

  it('falls back to the first note when the id is unknown', () => {
    expect(noteOrFirst(notes, 'nope')?.id).toBe('readme');
  });

  it('falls back to the first note when no id is given', () => {
    expect(noteOrFirst(notes, null)?.id).toBe('readme');
  });

  it('still prefers the requested note', () => {
    expect(noteOrFirst(notes, 'newer')?.id).toBe('newer');
  });

  it('returns null when there are no notes at all', () => {
    expect(noteOrFirst([], 'readme')).toBeNull();
  });
});
