import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

/*
 * The two configs below build in parallel, so a `clean: true` on either one
 * races the other's outputs (the preset's fast dts build lands first and gets
 * wiped). Clean once, deterministically, when the config loads instead.
 */
rmSync("dist", { recursive: true, force: true });

const componentEntries = {
  index: "src/index.ts",
  "citation-chip": "src/components/citation-chip/index.ts",
  "confidence-badge": "src/components/confidence-badge/index.ts",
  "token-meter": "src/components/token-meter/index.ts",
  "retrieval-trace": "src/components/retrieval-trace/index.ts",
  hooks: "src/hooks/index.ts",
  utils: "src/lib/index.ts",
};

const USE_CLIENT = '"use client";';

/**
 * esbuild applies the `banner`, but the rollup pass behind `treeshake: true`
 * strips module-level directives again ("use client" ... was ignored). Re-add
 * the directive to every component chunk after the build so Next.js App Router
 * consumers keep the client boundary — the reason the banner exists (SPEC
 * section 2.2). The Tailwind preset (a Node module) is deliberately excluded.
 */
function restoreUseClientDirective(): void {
  for (const file of readdirSync("dist")) {
    if (!/\.(js|cjs)$/.test(file) || file.startsWith("preset.")) continue;
    const path = join("dist", file);
    const code = readFileSync(path, "utf8");
    if (code.startsWith(USE_CLIENT) || code.startsWith("'use client'")) continue;
    writeFileSync(path, `${USE_CLIENT}\n${code}`);
  }
}

export default defineConfig([
  {
    entry: componentEntries,
    format: ["esm", "cjs"],
    dts: true,
    splitting: true, // shared chunks across entries, no duplicated helpers
    treeshake: true,
    sourcemap: true,
    clean: false, // see rmSync above
    target: "es2021",
    external: ["react", "react-dom"],
    banner: { js: USE_CLIENT },
    tsconfig: "tsconfig.build.json",
    onSuccess: async () => {
      restoreUseClientDirective();
    },
  },
  {
    entry: { preset: "tailwind/preset.ts" },
    format: ["esm", "cjs"],
    dts: true,
    platform: "node",
    target: "node18",
    clean: false,
    tsconfig: "tsconfig.build.json",
  },
]);
