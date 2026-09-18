import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // Global jsdom environment: the existing renderToStaticMarkup-based
    // tests run fine under jsdom (it's a superset of node's globals for
    // that purpose), and it's what the new @testing-library/react tests
    // need for render/rerender/fireEvent and DOM queries. Chosen over
    // per-file `// @vitest-environment jsdom` pragmas so every new test
    // file gets DOM APIs without having to remember the pragma.
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest-setup.ts"],
  },
});
