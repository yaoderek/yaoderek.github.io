// /llms.txt (llmstxt.org): a plain-Markdown map of the site for LLMs and
// agents, built from the same collections as the pages so it never drifts.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PERSON } from '../lib/seo';
import { formatMonthRange } from '../lib/os/format';

const iso = (date: Date) => date.toISOString().slice(0, 10);

export const GET: APIRoute = async ({ site }) => {
  const url = (path: string) =>
    new URL(`${import.meta.env.BASE_URL}${path}`, site).href;

  const [projects, writing, roles] = await Promise.all([
    getCollection('projects'),
    getCollection('writing'),
    getCollection('experience'),
  ]);
  const newest = <T extends { data: { created: Date } }>(a: T, b: T) =>
    b.data.created.getTime() - a.data.created.getTime();
  roles.sort((a, b) => b.data.start.getTime() - a.data.start.getTime());

  const lines = [
    `# ${PERSON.name}`,
    '',
    `> ${PERSON.summary}`,
    '',
    `The site at ${url('')} is styled as a small macOS desktop; every window is also a plain URL listed below.`,
    '',
    `- Email: ${PERSON.email}`,
    ...PERSON.sameAs.map((href) => `- ${new URL(href).hostname.replace(/^www\./, '')}: ${href}`),
    `- Résumé (PDF): ${url('resume.pdf')}`,
    '',
    '## Experience',
    '',
    ...roles.flatMap(({ data }) => [
      `- [${data.org}](${url(`experience/${data.id}/`)}): ${data.role}, ${formatMonthRange(
        iso(data.start),
        data.end ? iso(data.end) : undefined
      )}`,
      ...data.highlights.map((line) => `  - ${line}`),
    ]),
    '',
    '## Projects',
    '',
    ...projects
      .sort(newest)
      .map(({ id, data }) => `- [${data.title}](${url(`projects/${id}/`)}): ${data.oneLiner}`),
    '',
    '## Writing',
    '',
    ...writing
      .sort(newest)
      .map(({ id, data }) => `- [${data.title}](${url(`writing/${id}/`)})`),
    '',
    '## Optional',
    '',
    `- [Art](${url('art/')}): digital art by ${PERSON.name}`,
    `- [Life](${url('life/')}): photos`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
