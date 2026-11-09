/**
 * check-indexable.mjs
 *
 * After `astro build`, fail the build if a page that should be in Google
 * would be kept out of it. A failed build never deploys, so this is the last
 * stop before a mistake reaches Search Console.
 *
 * Every URL in the sitemap must:
 *   - have a built page,
 *   - carry no robots noindex/none meta tag,
 *   - declare itself as its own canonical (a canonical pointing elsewhere
 *     tells Google to index the other URL instead).
 * And no page anywhere in dist may carry noindex: the /personal/* redirect
 * stubs rely on the redirect alone, and nothing else should hide.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

if (!fs.existsSync(DIST)) {
  console.error('[check-indexable] dist/ not found — run `astro build` first');
  process.exit(1);
}

function collectHtml(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...collectHtml(full));
    else if (entry.name.endsWith('.html')) result.push(full);
  }
  return result;
}

/** Attribute value from the first tag matching `tagPattern`, or null. */
function attr(html, tagPattern, name) {
  const tag = html.match(tagPattern)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null;
}

const robotsMeta = /<meta\b[^>]*\bname\s*=\s*["'](?:robots|googlebot)["'][^>]*>/gi;
const blocksIndexing = (html) =>
  [...html.matchAll(robotsMeta)].some((m) => /\b(noindex|none)\b/i.test(m[0]));

const problems = [];

// 1. No page in the build carries noindex.
for (const file of collectHtml(DIST)) {
  if (blocksIndexing(fs.readFileSync(file, 'utf-8'))) {
    problems.push(`${path.relative(DIST, file)}: robots meta blocks indexing`);
  }
}

// 2. Every sitemap URL is a built page that names itself canonical.
const sitemapFiles = fs.readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
if (sitemapFiles.length === 0) problems.push('no sitemap-N.xml in dist');

const urls = sitemapFiles.flatMap((f) =>
  [...fs.readFileSync(path.join(DIST, f), 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1]
  )
);

for (const url of urls) {
  const { pathname } = new URL(url);
  const file = path.join(DIST, decodeURIComponent(pathname), 'index.html');
  if (!fs.existsSync(file)) {
    problems.push(`${url}: in sitemap but no page at ${path.relative(DIST, file)}`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf-8');
  const canonical = attr(html, /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i, 'href');
  if (canonical !== url) {
    problems.push(`${url}: canonical is ${canonical ?? 'missing'}, expected itself`);
  }
}

if (problems.length > 0) {
  console.error(
    `[check-indexable] ${problems.length} page(s) would be kept out of Google:\n  ` +
      problems.join('\n  ')
  );
  process.exit(1);
}

console.log(`[check-indexable] ${urls.length} sitemap URL(s) indexable, no noindex anywhere.`);
