import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { marked } from "marked";

const repo = resolve(import.meta.dirname, "..");

/** Replace <!-- md:path --> markers with the rendered Markdown at build time. */
function markdownIncludes(): Plugin {
  const slug = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    name: "markdown-includes",
    transformIndexHtml(html) {
      return html.replace(/<!--\s*md:([\w/.-]+)\s*-->/g, (_, file: string) => {
        const src = readFileSync(resolve(repo, file), "utf8");
        const renderer = new marked.Renderer();
        renderer.heading = ({ tokens, depth }) => {
          const text = marked.Parser.parseInline(tokens);
          return `<h${depth + 1} id="${slug(text)}">${text}</h${depth + 1}>\n`;
        };
        // Links between guides point at sections of this page.
        renderer.link = ({ href, tokens }) => {
          const text = marked.Parser.parseInline(tokens);
          const local = /^([\w-]+)\.md(#.*)?$/.exec(href ?? "");
          return `<a href="${local ? `#${local[1]}` : href}">${text}</a>`;
        };
        return marked.parse(src, { renderer, async: false }) as string;
      });
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".md")) server.ws.send({ type: "full-reload" });
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@mathinput/core": resolve(repo, "packages/core/src/index.ts"),
      "@mathinput/element": resolve(repo, "packages/element/src/index.ts"),
    },
  },
  plugins: [markdownIncludes()],
  server: { port: 0 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        docs: resolve(import.meta.dirname, "docs/index.html"),
        demo: resolve(import.meta.dirname, "demo/index.html"),
      },
    },
  },
});
