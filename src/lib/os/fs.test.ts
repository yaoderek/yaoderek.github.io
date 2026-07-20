import { describe, it, expect } from 'vitest';
import { buildTree, findNode } from './fs';
import type { TreeInput } from './types';

const fixture: TreeInput = {
  readme: {
    text: '<p>Hi, I\'m Derek.</p><p>I study art &amp; CS.</p>',
    created: '2025-01-01',
  },
  projects: [
    {
      slug: 'speakeasy',
      title: 'SpeakEasy',
      oneLiner: 'An AI conversation trainer',
      kind: 'Web app',
      status: 'shipped',
      created: '2024-06-01',
      stack: ['FastAPI', 'React'],
      thumbUrl: '/images/speakeasy-thumb.png',
      imageUrls: ['/images/speakeasy-1.png', '/images/speakeasy-2.png'],
      bodyHtml: '<p>SpeakEasy helps you practice conversations.</p>',
      repo: 'https://github.com/derekYao/speakeasy',
      demo: 'https://speakeasy.app',
    },
  ],
  writing: [
    {
      slug: 'on-design',
      title: 'On Design',
      created: '2024-03-15',
      bodyHtml: '<p>Design is intention made visible.</p>',
      bodyText: 'Design is intention made visible. Every choice communicates something.',
    },
  ],
  art: [
    {
      id: 'painting-001',
      title: 'Blue Horizon',
      created: '2024-01-10',
      medium: 'Oil on canvas',
      imageUrl: '/images/painting-001.jpg',
      width: 1200,
      height: 800,
    },
  ],
  life: [
    {
      id: 'photo-001',
      title: 'Morning Walk',
      created: '2024-02-20',
      medium: 'Photography',
      imageUrl: '/images/photo-001.jpg',
      width: 1920,
      height: 1080,
    },
  ],
};

describe('buildTree', () => {
  const root = buildTree(fixture);

  it('root has name "derek\'s mac" and path "/"', () => {
    expect(root.name).toBe("derek's mac");
    expect(root.path).toBe('/');
    expect(root.kind).toBe('Folder');
  });

  it('root children names are exactly [README.txt, projects, writing, art, life] in order', () => {
    const names = root.children!.map((c) => c.name);
    expect(names).toEqual(['README.txt', 'projects', 'writing', 'art', 'life']);
  });

  it('README node has correct kind and open', () => {
    const readme = root.children!.find((c) => c.name === 'README.txt')!;
    expect(readme.kind).toBe('Plain Text');
    expect(readme.path).toBe('/README.txt');
    expect(readme.open?.app).toBe('doc');
    expect((readme.open?.props as { title: string }).title).toBe('README.txt');
  });

  it('README node meta is [["Kind","Plain Text"],["Created",<formatted date>]]', () => {
    const readme = root.children!.find((c) => c.name === 'README.txt')!;
    const meta = readme.meta!;
    expect(meta).toBeDefined();
    expect(meta[0]).toEqual(['Kind', 'Plain Text']);
    expect(meta[1][0]).toBe('Created');
    // fixture created = '2025-01-01' → formatDate → 'Jan 1, 2025'
    expect(meta[1][1]).toBe('Jan 1, 2025');
    expect(meta.length).toBe(2);
  });

  it('README node blurb is plain-text with HTML stripped, entities decoded, whitespace collapsed', () => {
    const readme = root.children!.find((c) => c.name === 'README.txt')!;
    expect(readme.blurb).toBeDefined();
    expect(readme.blurb).toContain("Hi, I'm Derek.");
    expect(readme.blurb).toContain('I study art & CS.');
    expect(readme.blurb).not.toMatch(/<[^>]+>/); // no HTML tags
  });

  it('projects folder node is a Folder with icon folder', () => {
    const projects = root.children!.find((c) => c.name === 'projects')!;
    expect(projects.kind).toBe('Folder');
    expect(projects.icon).toBe('folder');
    expect(projects.path).toBe('/projects');
  });

  it('project child node is named slug.app with kind from input', () => {
    const projects = root.children!.find((c) => c.name === 'projects')!;
    const speakeasy = projects.children!.find((c) => c.name === 'speakeasy.app')!;
    expect(speakeasy).toBeDefined();
    expect(speakeasy.kind).toBe('Web app');
    expect(speakeasy.icon).toBe('app');
  });

  it('project node path is /projects/<slug> WITHOUT .app suffix', () => {
    const speakeasy = findNode(root, '/projects/speakeasy')!;
    expect(speakeasy).not.toBeNull();
    expect(speakeasy.path).toBe('/projects/speakeasy');
    expect(speakeasy.kind).toBe('Web app');
  });

  it('project node meta has Kind, Created, Stack, Status in order', () => {
    const speakeasy = findNode(root, '/projects/speakeasy')!;
    const meta = speakeasy.meta!;
    expect(meta[0][0]).toBe('Kind');
    expect(meta[1][0]).toBe('Created');
    expect(meta[2][0]).toBe('Stack');
    expect(meta[2][1]).toBe('FastAPI, React');
    expect(meta[3][0]).toBe('Status');
    expect(meta[3][1]).toBe('shipped');
  });

  it('project node open.app === "project" with correct props', () => {
    const speakeasy = findNode(root, '/projects/speakeasy')!;
    expect(speakeasy.open?.app).toBe('project');
    const props = speakeasy.open?.props as Record<string, unknown>;
    expect(props.title).toBe('SpeakEasy');
    expect(props.oneLiner).toBe('An AI conversation trainer');
    expect(props.stack).toEqual(['FastAPI', 'React']);
    expect(props.status).toBe('shipped');
    expect(props.bodyHtml).toBe('<p>SpeakEasy helps you practice conversations.</p>');
    expect(props.repo).toBe('https://github.com/derekYao/speakeasy');
    expect(props.demo).toBe('https://speakeasy.app');
  });

  it('writing node has kind "Plain Text" with correct meta', () => {
    const article = findNode(root, '/writing/on-design')!;
    expect(article).not.toBeNull();
    expect(article.kind).toBe('Plain Text');
    expect(article.icon).toBe('doc');
    const meta = article.meta!;
    expect(meta[0][0]).toBe('Kind');
    expect(meta[1][0]).toBe('Created');
    expect(meta[2][0]).toBe('Words');
  });

  it('writing node open.app === "doc" with title and html', () => {
    const article = findNode(root, '/writing/on-design')!;
    expect(article.open?.app).toBe('doc');
    const props = article.open?.props as Record<string, unknown>;
    expect(props.title).toBe('On Design');
    expect(props.html).toBe('<p>Design is intention made visible.</p>');
    expect(props.created).toBe('2024-03-15');
  });

  it('writing node meta includes word count', () => {
    const article = findNode(root, '/writing/on-design')!;
    const wordsMeta = article.meta!.find(([k]) => k === 'Words')!;
    expect(wordsMeta).toBeDefined();
    // "Design is intention made visible. Every choice communicates something." = 9 words
    expect(Number(wordsMeta[1])).toBe(9);
  });

  it('writing node has blurb from firstSentence', () => {
    const article = findNode(root, '/writing/on-design')!;
    expect(article.blurb).toBe('Design is intention made visible.');
  });

  it('art node has kind "PNG image" with correct meta dimensions', () => {
    const painting = findNode(root, '/art/painting-001')!;
    expect(painting).not.toBeNull();
    expect(painting.kind).toBe('PNG image');
    expect(painting.icon).toBe('image');
    const meta = painting.meta!;
    expect(meta[0][0]).toBe('Kind');
    expect(meta[1][0]).toBe('Created');
    expect(meta[2][0]).toBe('Dimensions');
    expect(meta[2][1]).toBe('1200 × 800');
    expect(meta[3][0]).toBe('Medium');
    expect(meta[3][1]).toBe('Oil on canvas');
  });

  it('art node has previewImage and correct open', () => {
    const painting = findNode(root, '/art/painting-001')!;
    expect(painting.previewImage).toBe('/images/painting-001.jpg');
    expect(painting.open?.app).toBe('gallery');
    const props = painting.open?.props as { items: unknown[]; index: number };
    expect(props.index).toBe(0);
    expect(Array.isArray(props.items)).toBe(true);
    expect(props.items.length).toBe(1);
  });

  it('art node name is id.png', () => {
    const artFolder = root.children!.find((c) => c.name === 'art')!;
    const painting = artFolder.children!.find((c) => c.name === 'painting-001.png')!;
    expect(painting).toBeDefined();
  });

  it('findNode returns null for missing path', () => {
    expect(findNode(root, '/nope')).toBeNull();
  });

  it('findNode returns root for "/"', () => {
    expect(findNode(root, '/')).toBe(root);
  });
});
