/**
 * The Notes app's view of the filesystem.
 *
 * Every note lives somewhere in the Finder — the README at the root, the essays
 * under /writing — and the Notes app gathers them into one flat list, the way
 * Notes shows a folder's worth of notes beside the one you're reading.
 *
 * The list is read back off the tree instead of being passed around separately,
 * so a note's body is serialized once, on its own node.
 */

import type { FSNode, NoteItem } from './types';

/** Every note in the tree, pinned ones first and newest first after that. */
export function noteList(tree: FSNode): NoteItem[] {
  const notes: NoteItem[] = [];
  collectNotes(tree, notes);
  return notes.sort(compareNotes);
}

/** The note with this id, or null when nothing matches. */
export function noteAt(notes: NoteItem[], id: string | null): NoteItem | null {
  if (id === null) return null;
  return notes.find((note) => note.id === id) ?? null;
}

/**
 * The note a window should show when asked for `id`: the requested note, or
 * the first one in the list as a fallback so the app never opens empty.
 */
export function noteOrFirst(
  notes: NoteItem[],
  id: string | null
): NoteItem | null {
  return noteAt(notes, id) ?? notes[0] ?? null;
}

function collectNotes(node: FSNode, out: NoteItem[]) {
  if (node.open?.app === 'notes' && node.open.props.note) {
    out.push(node.open.props.note as NoteItem);
  }
  for (const child of node.children ?? []) {
    collectNotes(child, out);
  }
}

/** Pinned notes rise to the top; the rest read newest first. */
function compareNotes(a: NoteItem, b: NoteItem): number {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
  return b.created.localeCompare(a.created);
}
