import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "apps/desktop/package.json",
  "apps/desktop/index.html",
  "apps/desktop/src/main.tsx",
  "apps/desktop/src-tauri/Cargo.toml",
  "apps/desktop/src-tauri/tauri.conf.json"
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing frontend shell file: ${relative}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "apps/desktop/package.json"), "utf8"));
for (const dependency of ["@tauri-apps/api", "pixi.js", "react", "xstate", "zustand"]) {
  if (!(dependency in (packageJson.dependencies ?? {}))) {
    throw new Error(`Missing declared frontend dependency: ${dependency}`);
  }
}

console.log("Validated frontend shell manifest.");
