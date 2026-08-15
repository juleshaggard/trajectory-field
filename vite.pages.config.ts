import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "trajectory-field";

export default defineConfig({
  root: "static-site",
  base: `/${repositoryName}/`,
  publicDir: "../public",
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
  },
});
