import type { FSNode, TreeInput } from './types';
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
  const readmeNode: FSNode = {
    name: 'README.txt',
    path: '/README.txt',
    kind: 'Plain Text',
    icon: 'doc',
    created: input.readme.created,
    meta: readmeMeta,
    blurb: stripHtml(input.readme.text),
    open: {
      app: 'doc',
      props: {
        title: 'README.txt',
        html: input.readme.text,
        created: input.readme.created,
      },
    },
  };

  // Build gallery items for art and life pieces
  const artItems = input.art.map((piece) => ({
    id: piece.id,
    title: piece.title,
    imageUrl: piece.imageUrl,
    created: piece.created,
    medium: piece.medium,
    width: piece.width,
    height: piece.height,
  }));

  const lifeItems = input.life.map((piece) => ({
    id: piece.id,
    title: piece.title,
    imageUrl: piece.imageUrl,
    created: piece.created,
    medium: piece.medium,
    width: piece.width,
    height: piece.height,
  }));

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
      const openProps: Record<string, unknown> = {
        title: p.title,
        oneLiner: p.oneLiner,
        stack: p.stack,
        status: p.status,
        created: p.created,
        thumbUrl: p.thumbUrl,
        imageUrls: p.imageUrls,
        bodyHtml: p.bodyHtml,
      };
      if (p.repo !== undefined) openProps.repo = p.repo;
      if (p.demo !== undefined) openProps.demo = p.demo;
      return {
        name: `${p.slug}.app`,
        path: `/projects/${p.slug}`,
        kind: p.kind,
        icon: 'app',
        created: p.created,
        meta,
        open: { app: 'project', props: openProps },
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
      return {
        name: w.slug,
        path: `/writing/${w.slug}`,
        kind: 'Plain Text',
        icon: 'doc',
        created: w.created,
        meta,
        blurb: firstSentence(w.bodyText),
        open: {
          app: 'doc',
          props: {
            title: w.title,
            html: w.bodyHtml,
            created: w.created,
          },
        },
      } satisfies FSNode;
    }),
  };

  const artFolder: FSNode = {
    name: 'art',
    path: '/art',
    kind: 'Folder',
    icon: 'folder',
    children: input.art.map((piece, index) => {
      const meta: [string, string][] = [
        ['Kind', 'PNG image'],
        ['Created', formatDate(piece.created)],
        ['Dimensions', `${piece.width} × ${piece.height}`],
        ['Medium', piece.medium],
      ];
      return {
        name: `${piece.id}.png`,
        path: `/art/${piece.id}`,
        kind: 'PNG image',
        icon: 'image',
        created: piece.created,
        meta,
        previewImage: piece.imageUrl,
        open: {
          app: 'gallery',
          props: {
            items: artItems,
            index,
          },
        },
      } satisfies FSNode;
    }),
  };

  const lifeFolder: FSNode = {
    name: 'life',
    path: '/life',
    kind: 'Folder',
    icon: 'folder',
    children: input.life.map((piece, index) => {
      const meta: [string, string][] = [
        ['Kind', 'PNG image'],
        ['Created', formatDate(piece.created)],
        ['Dimensions', `${piece.width} × ${piece.height}`],
        ['Medium', piece.medium],
      ];
      return {
        name: `${piece.id}.png`,
        path: `/life/${piece.id}`,
        kind: 'PNG image',
        icon: 'image',
        created: piece.created,
        meta,
        previewImage: piece.imageUrl,
        open: {
          app: 'gallery',
          props: {
            items: lifeItems,
            index,
          },
        },
      } satisfies FSNode;
    }),
  };

  return {
    name: "derek's mac",
    path: '/',
    kind: 'Folder',
    icon: 'folder',
    children: [readmeNode, projectsFolder, writingFolder, artFolder, lifeFolder],
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
