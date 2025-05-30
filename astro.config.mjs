import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import astroExpressiveCode from "astro-expressive-code";
import robotsTxt from "astro-robots-txt";
import { defineConfig } from "astro/config";
import unocss from "unocss/astro";
import { SITE } from "./src/config";
import { remarkPlugins, rehypePlugins } from "./plugins";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  base: SITE.base,
  integrations: [
    sitemap(),
    robotsTxt(),
    unocss({ injectReset: true }),
    astroExpressiveCode(),
    mdx(),
  ],
  markdown: {
    syntaxHighlight: false,
    remarkPlugins,
    rehypePlugins,
  },
  image: {
    domains: SITE.imageDomains,
    // Used for all local (except `/public`) and remote images using `![]()` syntax; not configurable per-image
    // Used for all `<Image />` and `<Picture />` components unless overridden with `layout` prop
    experimentalLayout: "constrained",
  },
  vite: {
    server: {
      headers: {
        // Enable CORS for dev: allow Giscus iframe to load local styles
        "Access-Control-Allow-Origin": "*",
      },
    },
    build: { chunkSizeWarningLimit: 1200 },
  },
  experimental: {
    responsiveImages: true,
    contentIntellisense: true,
    preserveScriptOrder: true,
    headingIdCompat: true,
  },
});
