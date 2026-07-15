import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const assetDir = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(assetDir, "avatar_manifest.json"), "utf8"));
const expectedActions = ["idle", "blink", "petted", "happy", "eating", "sleeping", "angry", "dragging"];
const layerIds = new Set(manifest.layers.map((layer) => layer.id));

for (const actionId of expectedActions) {
  if (!manifest.actions.some((action) => action.id === actionId)) throw new Error(`Missing action: ${actionId}`);
}
for (const action of manifest.actions) {
  for (const layerId of action.visible_layers) {
    if (!layerIds.has(layerId)) throw new Error(`Action ${action.id} references missing layer ${layerId}`);
  }
}

for (const layer of manifest.layers) {
  const file = path.join(assetDir, layer.file);
  const png = PNG.sync.read(fs.readFileSync(file));
  if (png.width !== 320 || png.height !== 320) throw new Error(`Unexpected dimensions: ${layer.file}`);
  const corners = [0, (png.width - 1) * 4, (png.height - 1) * png.width * 4, (png.width * png.height - 1) * 4];
  if (corners.some((index) => png.data[index + 3] !== 0)) throw new Error(`Non-transparent corner: ${layer.file}`);
  let visiblePixels = 0;
  for (let index = 3; index < png.data.length; index += 4) if (png.data[index] > 8) visiblePixels += 1;
  if (visiblePixels < 20) throw new Error(`Layer is empty: ${layer.file}`);
}

console.log(`Validated ${manifest.layers.length} cute dog layers and ${expectedActions.length} actions.`);
