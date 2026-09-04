/**
 * Pure routing helpers mapping between the window manager and the URL bar.
 *
 * No DOM/history access here — callers (Desktop.svelte) own side effects.
 * These map filesystem paths to shareable URLs and back.
 */

/** Public section prefixes that appear in URLs. */
const SECTIONS = ['projects', 'writing', 'experience', 'art', 'life'] as const;

/** Sections that support deep-linked item URLs (/<section>/<id>). */
const ITEM_SECTIONS = new Set([
  'projects',
  'writing',
  'experience',
  'art',
  'life',
]);

/**
 * The URL path that represents a given top window.
 *
 * - `null`, a window with no path, the Finder, internal windows
 *   (Trash/About), and root-level docs (README) all map to `/`.
 * - Windows whose path is a public section item (e.g. a project) map to that
 *   item path directly.
 *
 * The Finder deliberately maps to `/` regardless of its folder selection:
 * only *opened* item windows change the URL, not folder navigation.
 */
export function pathForWin(
  win: { app: string; path?: string } | null
): string {
  if (!win || !win.path) return '/';
  const path = win.path;

  // Internal / non-shareable windows.
  if (win.app === 'finder') return '/';
  if (path.startsWith('/__')) return '/';

  // A public section item: /<section>/<id>.
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 2 && (SECTIONS as readonly string[]).includes(parts[0])) {
    return path;
  }

  // Root-level docs (e.g. /README.txt) or anything else — not shareable.
  return '/';
}

/**
 * Given a URL pathname, return the filesystem path to open on load / popstate,
 * or `null` when the URL is the root (just show the desktop).
 *
 * Normalizes by stripping a trailing slash and lowercasing. Recognizes section
 * index paths (/projects, /writing, /art, /life) and item paths
 * (/projects/<slug>, /writing/<slug>, /art/<id>). Unknown shapes return null.
 */
export function urlToOpenPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase();
  if (normalized === '' || normalized === '/') return null;

  const parts = normalized.split('/').filter(Boolean);

  // Section index: /projects, /writing, /art, /life.
  if (parts.length === 1 && (SECTIONS as readonly string[]).includes(parts[0])) {
    return `/${parts[0]}`;
  }

  // Section item: /projects/<slug>, /writing/<slug>, /art/<id>.
  if (parts.length === 2 && ITEM_SECTIONS.has(parts[0])) {
    return `/${parts[0]}/${parts[1]}`;
  }

  return null;
}

/**
 * Map a filesystem path to a shareable URL path for use in history.pushState
 * on mobile. Paths that are not publicly routable (root-level files like
 * /README.txt, internal paths like /__trash__) map to '/'. Section folders
 * (/projects, /writing, etc.) and section items (/projects/speakeasy) pass
 * through as-is. '/' maps to '/'.
 *
 * This is the mobile equivalent of pathForWin for desktop windows.
 */
export function fsPathToUrl(path: string): string {
  if (!path || path === '/') return '/';

  // Internal paths.
  if (path.startsWith('/__')) return '/';

  const parts = path.split('/').filter(Boolean);

  // Section index: /projects, /writing, /art, /life.
  if (parts.length === 1 && (SECTIONS as readonly string[]).includes(parts[0])) {
    return path;
  }

  // Section item: /projects/<slug>, /writing/<slug>, /art/<id>.
  if (parts.length === 2 && (SECTIONS as readonly string[]).includes(parts[0])) {
    return path;
  }

  // Root-level files and anything else (e.g. /README.txt) — not shareable.
  return '/';
}

/**
 * Prefix a site-root-relative URL with the deploy base path (e.g. '/personal'
 * on a GitHub Pages project site). `base` is import.meta.env.BASE_URL, which
 * may or may not carry a trailing slash. With no base ('/'), the URL passes
 * through unchanged. '/' maps to '<base>/'.
 */
export function withBase(url: string, base: string): string {
  const nb = base.replace(/\/+$/, '');
  if (!nb) return url;
  return url === '/' ? `${nb}/` : `${nb}${url}`;
}

/**
 * Inverse of withBase: strip the deploy base from a location.pathname so the
 * result is a site-root-relative URL ('/personal/projects' -> '/projects',
 * '/personal' or '/personal/' -> '/'). Pathnames outside the base pass
 * through unchanged.
 */
export function stripBase(pathname: string, base: string): string {
  const nb = base.replace(/\/+$/, '');
  if (!nb) return pathname;
  if (pathname === nb) return '/';
  if (pathname.startsWith(`${nb}/`)) return pathname.slice(nb.length) || '/';
  return pathname;
}

/**
 * Map a legacy hash fragment (from an older single-page version of the site)
 * to a filesystem/URL path.
 *
 * `#projects/speakeasy` -> `/projects/speakeasy`, `#projects` -> `/projects`,
 * `#contact` / `#home` -> `/`. Unknown fragments return null.
 */
export function legacyHashToPath(hash: string): string | null {
  const value = hash.replace(/^#/, '').toLowerCase();
  if (value === '') return null;
  if (value === 'home' || value === 'contact') return '/';

  const parts = value.split('/').filter(Boolean);

  if (parts.length === 1 && (SECTIONS as readonly string[]).includes(parts[0])) {
    return `/${parts[0]}`;
  }

  if (parts.length === 2 && ITEM_SECTIONS.has(parts[0])) {
    return `/${parts[0]}/${parts[1]}`;
  }

  return null;
}
