import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const assetDir = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(assetDir, "avatar_manifest.json"), "utf8"));

if (manifest.schema_version !== "1.0.0" || manifest.canvas.width !== 320 || manifest.canvas.height !== 320) {
  throw new Error("Invalid avatar manifest version or canvas size");
}

const layerIds = new Set(manifest.layers.map((layer) => layer.id));
if (!manifest.actions.some((action) => action.id === "idle")) throw new Error("Avatar manifest requires idle action");
for (const action of manifest.actions) {
  for (const layerId of action.visible_layers) {
    if (!layerIds.has(layerId)) throw new Error(`Action ${action.id} references missing layer ${layerId}`);
  }
}
for (const region of manifest.collision_regions) {
  if (
    region.x < 0 ||
    region.y < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.x + region.width > manifest.canvas.width ||
    region.y + region.height > manifest.canvas.height
  ) {
    throw new Error(`Collision region is outside the canvas: ${region.id}`);
  }
}

for (const layer of manifest.layers) {
  const file = path.join(assetDir, layer.file);
  if (!fs.existsSync(file)) throw new Error(`Missing layer: ${layer.file}`);
  const png = PNG.sync.read(fs.readFileSync(file));
  if (png.width !== 320 || png.height !== 320) throw new Error(`Unexpected dimensions: ${layer.file}`);

  const cornerIndexes = [0, (png.width - 1) * 4, (png.height - 1) * png.width * 4, (png.width * png.height - 1) * 4];
  if (cornerIndexes.some((index) => png.data[index + 3] !== 0)) {
    throw new Error(`Layer corners must be transparent: ${layer.file}`);
  }

  let opaquePixels = 0;
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index] > 8) opaquePixels += 1;
  }
  if (opaquePixels < 20) throw new Error(`Layer is unexpectedly empty: ${layer.file}`);
}

console.log(`Validated ${manifest.layers.length} transparent pet layers.`);
