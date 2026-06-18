import { defineConfig } from 'astro/config';

function lazyImages() {
  return function () {
    return function (tree) {
      function walk(node) {
        if (node.type === 'element' && node.tagName === 'img') {
          if (!node.properties) node.properties = {};
          node.properties.loading = 'lazy';
        }
        // Also patch raw HTML strings (gallery divs, figure tags, etc.)
        if ((node.type === 'raw' || node.type === 'html') && node.value) {
          node.value = node.value.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"');
        }
        if (node.children) node.children.forEach(walk);
      }
      walk(tree);
    };
  };
}

export default defineConfig({
  site: 'https://spykevision.com',
  build: { format: 'directory' },
  markdown: {
    rehypePlugins: [lazyImages()],
  },
});
