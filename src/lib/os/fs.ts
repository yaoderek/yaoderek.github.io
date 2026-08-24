import type { FSNode, NoteItem, PhotoItem, TreeInput } from './types';
import { formatDate, wordCount, firstSentence, stripHtml } from './format';

/**
 * Build the Finder file-system tree from collection data.
 * Root node: name "derek's mac", path "/", kind "Folder".
 * Child order: README.txt, projects, writing, art, life.
 */
export function buildTree(input: TreeInput): FSNode {
  const readmeMeta: [string, string][] = [
    ['Kind', 'Plain Text'],
    ['Created', formatDate(input.readme.created)],
  ];
  const readmeText = stripHtml(input.readme.text);
  const readmeNote: NoteItem = {
    id: 'readme',
    path: '/README.txt',
    title: 'README.txt',
    created: input.readme.created,
    html: input.readme.text,
    snippet: firstSentence(readmeText),
    // The introduction sits at the top of the list, however old it is.
    pinned: true,
  };
  const readmeNode: FSNode = {
    name: 'README.txt',
    path: '/README.txt',
    kind: 'Plain Text',
    icon: 'doc',
    created: input.readme.created,
    meta: readmeMeta,
    blurb: readmeText,
    open: { app: 'notes', props: { note: readmeNote } },
  };

  const projectsFolder: FSNode = {
    name: 'projects',
    path: '/projects',
    kind: 'Folder',
    icon: 'folder',
    children: input.projects.map((p) => {
      const meta: [string, string][] = [
        ['Kind', p.kind],
        ['Created', formatDate(p.created)],
        ['Stack', p.stack.join(', ')],
        ['Status', p.status],
      ];
      const note: NoteItem = {
        id: p.slug,
        path: `/projects/${p.slug}`,
        // Notes keeps one flat list, so the prefix is what tells a project
        // apart from a piece of writing at a glance.
        title: `(project) ${p.title}`,
        created: p.created,
        html: projectNoteHtml(p),
        snippet: p.oneLiner,
      };
      return {
        name: `${p.slug}.app`,
        path: `/projects/${p.slug}`,
        kind: p.kind,
        icon: 'app',
        created: p.created,
        meta,
        // Keeps the thumbnail on the icon now that the app props are gone.
        previewImage: p.thumbUrl,
        blurb: p.oneLiner,
        open: { app: 'notes', props: { note } },
      } satisfies FSNode;
    }),
  };

  const writingFolder: FSNode = {
    name: 'writing',
    path: '/writing',
    kind: 'Folder',
    icon: 'folder',
    children: input.writing.map((w) => {
      const wc = wordCount(w.bodyText);
      const meta: [string, string][] = [
        ['Kind', 'Plain Text'],
        ['Created', formatDate(w.created)],
        ['Words', String(wc)],
      ];
      const snippet = firstSentence(w.bodyText);
      const note: NoteItem = {
        id: w.slug,
        path: `/writing/${w.slug}`,
        title: w.title,
        created: w.created,
        html: w.bodyHtml,
        snippet,
      };
      return {
        name: `${w.slug}.txt`,
        path: `/writing/${w.slug}`,
        kind: 'Plain Text',
        icon: 'doc',
        created: w.created,
        meta,
        blurb: snippet,
        open: { app: 'notes', props: { note } },
      } satisfies FSNode;
    }),
  };

  return {
    name: "derek's mac",
    path: '/',
    kind: 'Folder',
    icon: 'folder',
    children: [
      readmeNode,
      projectsFolder,
      writingFolder,
      buildAlbumFolder('art', input.art),
      buildAlbumFolder('life', input.life),
    ],
  };
}

/**
 * A project written out as a note: the one-liner, the facts worth knowing,
 * the screenshots, then the case study.
 *
 * Notes has no two-pane case-study layout, so the same material reads top to
 * bottom. The definition list matches the README's contact block, which the
 * note styles already lay out as a label/value grid.
 */
function projectNoteHtml(p: TreeInput['projects'][number]): string {
  const facts = [
    fact('kind', escapeHtml(p.kind)),
    fact('stack', escapeHtml(p.stack.join(', '))),
    fact('status', escapeHtml(p.status)),
    p.repo ? fact('repo', externalLink(p.repo)) : '',
    p.demo ? fact('demo', externalLink(p.demo)) : '',
  ].join('');

  const shots = p.imageUrls
    .map(
      (url, i) =>
        `<p><img src="${escapeHtml(url)}" alt="${escapeHtml(p.title)} screenshot ${
          i + 1
        }" loading="lazy" decoding="async" /></p>`
    )
    .join('\n');

  return [
    `<p>${escapeHtml(p.oneLiner)}</p>`,
    `<dl class="contact">${facts}</dl>`,
    shots,
    p.bodyHtml,
  ]
    .filter(Boolean)
    .join('\n');
}

function fact(label: string, valueHtml: string): string {
  return `<div><dt>${label}</dt><dd>${valueHtml}</dd></div>`;
}

/** A link that shows where it goes rather than the whole URL. */
function externalLink(url: string): string {
  const safe = escapeHtml(url);
  const shown = escapeHtml(url.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  return `<a href="${safe}" target="_blank" rel="noopener">${shown}</a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * A picture folder. Art and life are albums in the Photos app, not plain
 * directories: opening the folder or any picture inside it launches Photos.
 * The folder node carries the album's items so the app can read them once,
 * which keeps each picture node down to its position in the album.
 *
 * The folder name doubles as the album id (see lib/os/photos.ts).
 */
function buildAlbumFolder(album: string, pieces: PhotoItem[]): FSNode {
  return {
    name: album,
    path: `/${album}`,
    kind: 'Folder',
    icon: 'folder',
    open: { app: 'photos', props: { album, items: pieces } },
    children: pieces.map((piece, index) => {
      const meta: [string, string][] = [
        ['Kind', 'PNG image'],
        ['Created', formatDate(piece.created)],
        ['Dimensions', `${piece.width} × ${piece.height}`],
        ['Medium', piece.medium],
      ];
      return {
        name: `${piece.id}.png`,
        path: `/${album}/${piece.id}`,
        kind: 'PNG image',
        icon: 'image',
        created: piece.created,
        meta,
        previewImage: piece.imageUrl,
        open: { app: 'photos', props: { album, index } },
      } satisfies FSNode;
    }),
  };
}

/**
 * Find a node in the tree by exact path match.
 * Returns the root node for path '/'.
 * Returns null if not found.
 */
export function findNode(root: FSNode, path: string): FSNode | null {
  if (root.path === path) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, path);
      if (found !== null) return found;
    }
  }
  return null;
}
