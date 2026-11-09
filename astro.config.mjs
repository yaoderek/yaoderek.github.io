import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// GitHub Pages user site: served at https://yaoderek.github.io/.
// If this ever moves to a custom domain, update `site` and the Sitemap URL
// in public/robots.txt.
export default defineConfig({
  site: 'https://yaoderek.github.io',
  integrations: [
    svelte(),
    // The /personal/* pages are redirect stubs for the old project-site
    // URLs — keep them out of the sitemap.
    sitemap({ filter: (page) => !page.includes('/personal/') }),
  ],
  output: 'static',
});
