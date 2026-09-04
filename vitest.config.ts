import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      // Storybook-only modules: stories and the decorators they share.
      exclude: [
        "src/**/*.stories.tsx",
        "src/stories/decorators.tsx",
        "src/**/index.ts",
        "src/types.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
