# derekOS

A personal site styled as a fake mini-macOS desktop environment. Built with Astro 5 + Svelte 5.

The "desktop" runs entirely in a single Svelte island (`client:only`). Every URL is a real route with a noscript fallback so content is crawlable without JS.

## Stack

- **Astro 5** (static output) — routing, content collections, SSG
- **Svelte 5** (runes) — interactive desktop shell
- **Vitest** — unit tests for pure logic (fs tree, window manager, dock)

## Commands

```bash
npm run dev       # start dev server (localhost:4321)
npm run build     # build to dist/
npm run preview   # preview the dist/ build locally
npm test          # run unit tests
```

## Content editing

| What | Where |
|------|-------|
| Writing posts | Drop a `.md` file in `src/content/writing/` (frontmatter: `title`, `created`) |
| Projects | Drop a `.md` file in `src/content/projects/` (frontmatter: `title`, `oneLiner`, `kind`, `status`, `created`, `stack` (array), `thumb`, `images` (array), optional `repo`, `demo`) |
| Art entries | Edit `src/content/art.yaml` (fields: `id`, `title`, `created`, `medium`, `image`) |
| Life photos | Edit `src/content/life.yaml` (same fields as art, plus optional `place: { name, lat, lng }` to pin it in Maps) |
| Resume | Drop `public/resume.pdf` to enable the Résumé dock icon |

## Hosting

### GitHub Pages (configured)

The site is configured as a GitHub Pages **user site** at
`https://yaoderek.github.io/` — `astro.config.mjs` sets
`site: 'https://yaoderek.github.io'`, and all internal links and client-side
routing are base-aware (via `withBase`/`stripBase` in `src/lib/os/router.ts`
and `import.meta.env.BASE_URL` in pages), so a `base` can be reintroduced if
the site ever moves back under a subpath. The old project-site URLs under
`/personal/` are served as redirect stubs (`src/pages/personal/[...slug].astro`).

Deploys run from `.github/workflows/deploy.yml` on every push to `main`.
One-time setup: in GitHub repo **Settings → Pages**, set source to
**GitHub Actions**.

### Moving to a custom domain later

1. Change `site` in `astro.config.mjs` to the domain and **remove `base`**.
2. Add the domain in Settings → Pages (GitHub writes the CNAME).

### Netlify / Vercel

Point your provider at build command `npm run build`, publish directory
`dist`; set `site` to your production URL and remove `base`.
