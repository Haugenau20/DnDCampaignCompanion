// vite.config.ts
import fs from "fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Every `process.env.REACT_APP_*` name under `dir`. The source keeps CRA's
 * names (T059), and each is replaced at build time. A name left unreplaced
 * would reach the browser as `process.env.X` and throw `process is not
 * defined`, so the names come from the source, not from the .env files:
 * a name no .env file sets (REACT_APP_VERSION, say) becomes `undefined`.
 */
function reactAppNames(dir: string): Set<string> {
  const names = new Set<string>();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      reactAppNames(full).forEach((name) => names.add(name));
    } else if (/\.tsx?$/.test(entry.name)) {
      for (const match of fs.readFileSync(full, "utf8").matchAll(/process\.env\.(REACT_APP_\w+)/g)) {
        names.add(match[1]);
      }
    }
  }
  return names;
}

export default defineConfig(({ mode }) => {
  // The environment (CI's secrets) wins over .env files, as it did under CRA.
  const env = loadEnv(mode, process.cwd(), "REACT_APP_");
  const names = new Set([...Object.keys(env), ...reactAppNames(path.join(process.cwd(), "src"))]);
  const define = Object.fromEntries(
    [...names].map((name) => [
      `process.env.${name}`,
      env[name] === undefined ? "undefined" : JSON.stringify(env[name]),
    ])
  );

  return {
    // tsconfigPaths: the bare `baseUrl` imports (`core/types/common`) and `@/`.
    plugins: [react(), tsconfigPaths()],
    define,
    server: {
      // IPv4 on purpose: start-dev.ps1's health check asks 127.0.0.1:3000.
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      open: true,
    },
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
    // `build/`: firebase.json serves it and the Hosting workflows copy it.
    // Source maps shipped under CRA too, and check-bundle-size's hint reads them.
    build: {
      outDir: "build",
      sourcemap: true,
      // The entry is ~850 kB minified, over Rollup's 500 kB warning.
      // scripts/check-bundle-size.js is its real gate (T030), gzipped.
      chunkSizeWarningLimit: 1000,
    },
  };
});
