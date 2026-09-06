import { describe, it, expect } from 'vitest';
import { buildTree, findNode } from './fs';
import type { ExperienceItem, NoteItem, TreeInput } from './types';

const fixture: TreeInput = {
  intro: {
    text: '<p>I\'m Derek.</p><p>I study art &amp; CS.</p>',
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
  experience: [
    {
      id: 'contour',
      org: 'Contour',
      role: 'Software engineering intern',
      note: 'employee #5',
      calendar: 'work',
      start: '2026-06-01',
      highlights: ['Shipped the Linear sync.', 'Scaled the meeting bots.'],
    },
    {
      id: 'oracle',
      org: 'Oracle',
      role: 'Product manager, contract',
      calendar: 'work',
      start: '2025-12-01',
      end: '2026-04-30',
      highlights: ['Advised on agent adoption.'],
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

  it('the five folders are the only children the Finder can browse', () => {
    const visible = root
      .children!.filter((c) => !c.hidden)
      .map((c) => c.name);
    expect(visible).toEqual(['projects', 'writing', 'experience', 'art', 'life']);
  });

  it('carries the intro as a hidden note, pinned and titled "Hi there!"', () => {
    const intro = root.children!.find((c) => c.path === '/intro')!;
    expect(intro.hidden).toBe(true);
    expect(intro.kind).toBe('Plain Text');
    expect(intro.open?.app).toBe('notes');
    const note = intro.open?.props.note as NoteItem;
    expect(note.id).toBe('intro');
    expect(note.title).toBe('Hi there!');
    expect(note.path).toBe('/intro');
    // The introduction leads the list regardless of its date.
    expect(note.pinned).toBe(true);
  });

  it("the intro note's snippet is plain text, entities decoded, tags stripped", () => {
    const intro = root.children!.find((c) => c.path === '/intro')!;
    const note = intro.open?.props.note as NoteItem;
    expect(note.html).toContain("<p>I'm Derek.</p>");
    expect(note.snippet).toContain("I'm Derek.");
    expect(note.snippet).not.toMatch(/<[^>]+>/); // no HTML tags
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

  it('project node open.app === "notes", titled and dated from the project', () => {
    const speakeasy = findNode(root, '/projects/speakeasy')!;
    expect(speakeasy.open?.app).toBe('notes');
    const note = speakeasy.open?.props.note as NoteItem;
    expect(note.id).toBe('speakeasy');
    expect(note.path).toBe('/projects/speakeasy');
    // Prefixed, so a project stands out in Notes' one flat list.
    expect(note.title).toBe('(project) SpeakEasy');
    expect(note.created).toBe('2024-06-01');
    // The one-liner is what the list row shows under the title.
    expect(note.snippet).toBe('An AI conversation trainer');
  });

  it('project note carries the one-liner, the facts, the shots, and the body', () => {
    const speakeasy = findNode(root, '/projects/speakeasy')!;
    const { html } = speakeasy.open?.props.note as NoteItem;

    expect(html).toContain('<p>An AI conversation trainer</p>');
    expect(html).toContain('<dt>stack</dt><dd>FastAPI, React</dd>');
    expect(html).toContain('<dt>status</dt><dd>shipped</dd>');
    expect(html).toContain('<dt>kind</dt><dd>Web app</dd>');
    // Links show where they go, not the whole URL.
    expect(html).toContain('href="https://github.com/derekYao/speakeasy"');
    expect(html).toContain('>github.com/derekYao/speakeasy</a>');
    expect(html).toContain('>speakeasy.app</a>');
    // Every screenshot rides along, captioned for screen readers.
    expect(html).toContain('src="/images/speakeasy-1.png"');
    expect(html).toContain('src="/images/speakeasy-2.png"');
    expect(html).toContain('alt="SpeakEasy screenshot 2"');
    // The case study reads last.
    expect(html).toContain('<p>SpeakEasy helps you practice conversations.</p>');
  });

  it('project note leaves out repo and demo rows when there are none', () => {
    const bare = buildTree({
      ...fixture,
      projects: [
        {
          ...fixture.projects[0],
          slug: 'quiet',
          repo: undefined,
          demo: undefined,
        },
      ],
    });
    const { html } = findNode(bare, '/projects/quiet')!.open?.props
      .note as NoteItem;
    expect(html).not.toContain('<dt>repo</dt>');
    expect(html).not.toContain('<dt>demo</dt>');
  });

  it('project note escapes text that would otherwise be markup', () => {
    const risky = buildTree({
      ...fixture,
      projects: [
        {
          ...fixture.projects[0],
          slug: 'risky',
          oneLiner: 'Tools & <toys>',
        },
      ],
    });
    const { html } = findNode(risky, '/projects/risky')!.open?.props
      .note as NoteItem;
    expect(html).toContain('Tools &amp; &lt;toys&gt;');
  });

  it('project node keeps its thumbnail for the Finder icon', () => {
    const speakeasy = findNode(root, '/projects/speakeasy')!;
    expect(speakeasy.previewImage).toBe('/images/speakeasy-thumb.png');
  });

  it('experience folder hands the whole timeline to Calendar', () => {
    const folder = findNode(root, '/experience')!;
    expect(folder.kind).toBe('Folder');
    expect(folder.open?.app).toBe('calendar');
    const roles = folder.open?.props.roles as ExperienceItem[];
    expect(roles.map((r) => r.id)).toEqual(['contour', 'oracle']);
    expect(folder.children!.map((c) => c.name)).toEqual([
      'contour.ics',
      'oracle.ics',
    ]);
  });

  it('a role node opens Calendar on itself and reads as an event', () => {
    const contour = findNode(root, '/experience/contour')!;
    expect(contour.kind).toBe('Calendar Event');
    expect(contour.icon).toBe('calendar');
    expect(contour.created).toBe('2026-06-01');
    expect(contour.open?.app).toBe('calendar');
    expect(contour.open?.props.role).toBe('contour');
    // The role carries only its id: the folder above it holds the timeline.
    expect(contour.open?.props.roles).toBeUndefined();
    expect(contour.blurb).toBe('Shipped the Linear sync.');
  });

  it('a running role reads as "Present", a finished one as its last month', () => {
    const when = (path: string) =>
      findNode(root, path)!.meta!.find(([label]) => label === 'When')![1];
    expect(when('/experience/contour')).toBe('Jun 2026 – Present');
    expect(when('/experience/oracle')).toBe('Dec 2025 – Apr 2026');
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

  it('writing node open.app === "notes" and carries the note itself', () => {
    const article = findNode(root, '/writing/on-design')!;
    expect(article.open?.app).toBe('notes');
    const note = article.open?.props.note as NoteItem;
    expect(note.id).toBe('on-design');
    expect(note.path).toBe('/writing/on-design');
    expect(note.title).toBe('On Design');
    expect(note.html).toBe('<p>Design is intention made visible.</p>');
    expect(note.created).toBe('2024-03-15');
    expect(note.pinned).toBeUndefined();
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

  it('writing node name is slug.txt (spec IA: rue.txt)', () => {
    const writingFolder = root.children!.find((c) => c.name === 'writing')!;
    const article = writingFolder.children!.find((c) => c.name === 'on-design.txt')!;
    expect(article).toBeDefined();
    // path stays extensionless
    expect(article.path).toBe('/writing/on-design');
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

  it('art node has previewImage and opens the Photos app in the art album', () => {
    const painting = findNode(root, '/art/painting-001')!;
    expect(painting.previewImage).toBe('/images/painting-001.jpg');
    expect(painting.open?.app).toBe('photos');
    const props = painting.open?.props as { album: string; index: number };
    expect(props.album).toBe('art');
    expect(props.index).toBe(0);
  });

  it('art folder opens the Photos app carrying the album', () => {
    const art = root.children!.find((c) => c.name === 'art')!;
    expect(art.open?.app).toBe('photos');
    const props = art.open?.props as { album: string; items: unknown[] };
    expect(props.album).toBe('art');
    expect(props.items.length).toBe(1);
  });

  it('art node name is id.png', () => {
    const artFolder = root.children!.find((c) => c.name === 'art')!;
    const painting = artFolder.children!.find((c) => c.name === 'painting-001.png')!;
    expect(painting).toBeDefined();
  });

  it('life folder opens the Photos app carrying the album', () => {
    const life = root.children!.find((c) => c.name === 'life')!;
    expect(life.kind).toBe('Folder');
    expect(life.open?.app).toBe('photos');
    const props = life.open?.props as { album: string; items: unknown[] };
    expect(props.album).toBe('life');
    expect(props.items.length).toBe(1);
  });

  it('life photo node opens the Photos app at its own index', () => {
    const photo = findNode(root, '/life/photo-001')!;
    expect(photo).not.toBeNull();
    expect(photo.kind).toBe('PNG image');
    expect(photo.previewImage).toBe('/images/photo-001.jpg');
    expect(photo.open?.app).toBe('photos');
    const props = photo.open?.props as { album: string; index: number };
    expect(props.album).toBe('life');
    expect(props.index).toBe(0);
  });

  it('findNode returns null for missing path', () => {
    expect(findNode(root, '/nope')).toBeNull();
  });

  it('findNode returns root for "/"', () => {
    expect(findNode(root, '/')).toBe(root);
  });
});
