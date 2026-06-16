import { defineConfig } from 'astro/config';

function netlifyImages(width, quality) {
  width = width || 1440;
  quality = quality || 80;
  function cdnUrl(path) {
    return '/.netlify/images?url=' + encodeURIComponent(path) + '&w=' + width + '&q=' + quality;
  }
  function isLocal(src) {
    return src && /^\/(images|uploads)\//.test(src);
  }
  return function () {
    return function (tree) {
      function walk(node) {
        if (node.type === 'element' && node.tagName === 'img' && isLocal(node.properties && node.properties.src)) {
          node.properties.src = cdnUrl(node.properties.src);
        }
        if ((node.type === 'raw' || node.type === 'html') && node.value) {
          node.value = node.value.replace(
            /((?:src|data-before|data-after)=")(\/(images|uploads)\/[^"]+)(")/g,
            function (_, pre, path, _dir, post) { return pre + cdnUrl(path) + post; }
          );
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
    rehypePlugins: [netlifyImages(1440, 80)],
  },
});
