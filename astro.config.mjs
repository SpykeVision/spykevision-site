import { defineConfig } from 'astro/config';

// Static output — builds to dist/, deployed by Netlify.
export default defineConfig({
  site: 'https://spykevision.com',
  build: { format: 'directory' },
});
