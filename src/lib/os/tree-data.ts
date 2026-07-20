import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { TreeInput } from './types';
import { stripHtml } from './format';

/**
 * README content, authored as real HTML (injected via {@html} by the Doc app).
 */
const README_HTML = `<p>Hi, I'm Derek.</p>
<p>I'm a student at UW studying art and computer science. I've worked with Oracle on supply chain resilience and optimization, and I'm currently building agentic research systems with the Denolle and GAIA labs at UW.</p>
<dl class="contact">
  <div><dt>email</dt><dd><a href="mailto:yaoderek06@gmail.com">yaoderek06@gmail.com</a></dd></div>
  <div><dt>phone</dt><dd><a href="tel:+14255223218">425-522-3218</a></dd></div>
  <div><dt>github</dt><dd><a href="https://github.com/yaoderek">github.com/yaoderek</a></dd></div>
  <div><dt>linkedin</dt><dd><a href="https://linkedin.com/in/yaoderek">linkedin.com/in/yaoderek</a></dd></div>
</dl>
<p>thanks for stopping by — the good stuff is in <a href="/projects">/projects</a>.</p>`;

const README_CREATED = '2026-07-20';

/** Convert a Date | string to an ISO YYYY-MM-DD string. */
function isoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/** Produce an optimized URL string for a collection image import. */
async function toUrl(src: ImageMetadata): Promise<string> {
  const width = Math.min(src.width, 1600);
  const optimized = await getImage({ src, width, format: 'webp' });
  return optimized.src;
}

/**
 * Build the TreeInput from all four content collections.
 *
 * Must run in an Astro frontmatter context (uses astro:content + astro:assets).
 * `rendered` maps "projects/<slug>" and "writing/<slug>" to rendered HTML strings.
 * Projects and writing are sorted by `created` DESCENDING (newest first);
 * art and life keep their YAML order.
 */
export async function getTreeInput(
  rendered: Record<string, string>
): Promise<TreeInput> {
  const [projectsRaw, writingRaw, artRaw, lifeRaw] = await Promise.all([
    getCollection('projects'),
    getCollection('writing'),
    getCollection('art'),
    getCollection('life'),
  ]);

  const projectsSorted = [...projectsRaw].sort(
    (a, b) => b.data.created.getTime() - a.data.created.getTime()
  );
  const writingSorted = [...writingRaw].sort(
    (a, b) => b.data.created.getTime() - a.data.created.getTime()
  );

  const projects = await Promise.all(
    projectsSorted.map(async (entry) => {
      const thumbUrl = await toUrl(entry.data.thumb);
      const imageUrls = await Promise.all(entry.data.images.map(toUrl));
      const result: TreeInput['projects'][number] = {
        slug: entry.id,
        title: entry.data.title,
        oneLiner: entry.data.oneLiner,
        kind: entry.data.kind,
        status: entry.data.status,
        created: isoDate(entry.data.created),
        stack: entry.data.stack,
        thumbUrl,
        imageUrls,
        bodyHtml: rendered[`projects/${entry.id}`] ?? '',
      };
      if (entry.data.repo !== undefined) result.repo = entry.data.repo;
      if (entry.data.demo !== undefined) result.demo = entry.data.demo;
      return result;
    })
  );

  const writing = writingSorted.map((entry) => {
    const bodyHtml = rendered[`writing/${entry.id}`] ?? '';
    return {
      slug: entry.id,
      title: entry.data.title,
      created: isoDate(entry.data.created),
      bodyHtml,
      bodyText: stripHtml(bodyHtml),
    };
  });

  const mapPieces = (
    pieces: typeof artRaw
  ): Promise<TreeInput['art']> =>
    Promise.all(
      pieces.map(async (entry) => {
        const img = entry.data.image;
        const imageUrl = await toUrl(img);
        return {
          id: entry.data.id,
          title: entry.data.title,
          created: isoDate(entry.data.created),
          medium: entry.data.medium,
          imageUrl,
          width: img.width,
          height: img.height,
        };
      })
    );

  const [art, life] = await Promise.all([
    mapPieces(artRaw),
    mapPieces(lifeRaw),
  ]);

  return {
    readme: { text: README_HTML, created: README_CREATED },
    projects,
    writing,
    art,
    life,
  };
}
