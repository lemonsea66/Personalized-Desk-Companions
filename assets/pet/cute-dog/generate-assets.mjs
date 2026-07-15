import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const size = 320;
const sourceFile = path.join(outputDir, "source-gpt2-transparent.png");

function blank() {
  return new PNG({ width: size, height: size, colorType: 6 });
}

function bbox(source) {
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const alpha = source.data[(y * source.width + x) * 4 + 3];
      if (alpha <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function sample(source, x, y) {
  const clampedX = Math.max(0, Math.min(source.width - 1, x));
  const clampedY = Math.max(0, Math.min(source.height - 1, y));
  const index = (clampedY * source.width + clampedX) * 4;
  return [
    source.data[index],
    source.data[index + 1],
    source.data[index + 2],
    source.data[index + 3]
  ];
}

function over(target, x, y, rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size || rgba[3] <= 0) return;
  const index = (Math.floor(y) * size + Math.floor(x)) * 4;
  const sourceAlpha = rgba[3] / 255;
  const targetAlpha = target.data[index + 3] / 255;
  const alpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (alpha <= 0) return;
  for (let channel = 0; channel < 3; channel += 1) {
    target.data[index + channel] = Math.round(
      (rgba[channel] * sourceAlpha + target.data[index + channel] * targetAlpha * (1 - sourceAlpha)) / alpha
    );
  }
  target.data[index + 3] = Math.round(alpha * 255);
}

function drawSticker(target, source, options = {}) {
  const crop = bbox(source);
  const fit = options.fit ?? 292;
  const scale = Math.min(fit / crop.width, fit / crop.height) * (options.scale ?? 1);
  const drawWidth = Math.round(crop.width * scale);
  const drawHeight = Math.round(crop.height * scale);
  const offsetX = Math.round((size - drawWidth) / 2 + (options.offsetX ?? 0));
  const offsetY = Math.round((size - drawHeight) / 2 + (options.offsetY ?? 0));

  for (let y = 0; y < drawHeight; y += 1) {
    for (let x = 0; x < drawWidth; x += 1) {
      const sourceX = crop.minX + Math.min(crop.width - 1, Math.floor(x / scale));
      const sourceY = crop.minY + Math.min(crop.height - 1, Math.floor(y / scale));
      over(target, offsetX + x, offsetY + y, sample(source, sourceX, sourceY));
    }
  }
}

function ellipse(target, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) over(target, x, y, rgba);
    }
  }
}

function line(target, x1, y1, x2, y2, width, rgba) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps;
    ellipse(target, x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio, width / 2, width / 2, rgba);
  }
}

function heart(target, cx, cy, scale = 1) {
  const pink = [245, 114, 141, 230];
  ellipse(target, cx - 8 * scale, cy - 5 * scale, 10 * scale, 10 * scale, pink);
  ellipse(target, cx + 8 * scale, cy - 5 * scale, 10 * scale, 10 * scale, pink);
  line(target, cx - 17 * scale, cy, cx, cy + 22 * scale, 16 * scale, pink);
  line(target, cx + 17 * scale, cy, cx, cy + 22 * scale, 16 * scale, pink);
}

function addClosedEyeHint(target) {
  const ink = [55, 55, 55, 230];
  line(target, 103, 129, 125, 138, 4, ink);
  line(target, 125, 138, 147, 128, 4, ink);
  line(target, 173, 128, 195, 138, 4, ink);
  line(target, 195, 138, 217, 129, 4, ink);
}

function save(name, draw) {
  const frame = blank();
  draw(frame);
  fs.writeFileSync(path.join(outputDir, name), PNG.sync.write(frame));
}

const source = PNG.sync.read(fs.readFileSync(sourceFile));

save("idle.png", (png) => drawSticker(png, source));
save("blink.png", (png) => {
  drawSticker(png, source);
  addClosedEyeHint(png);
});
save("happy.png", (png) => {
  drawSticker(png, source, { scale: 1.02, offsetY: -4 });
  heart(png, 246, 54, 0.72);
});
save("petted.png", (png) => {
  drawSticker(png, source, { scale: 0.99, offsetY: 4 });
  heart(png, 240, 58, 0.62);
  heart(png, 86, 70, 0.45);
});
save("eating.png", (png) => {
  drawSticker(png, source);
  ellipse(png, 245, 268, 42, 15, [67, 76, 82, 230]);
  ellipse(png, 245, 264, 37, 11, [105, 200, 195, 240]);
  ellipse(png, 230, 251, 8, 8, [245, 196, 81, 255]);
  ellipse(png, 248, 248, 9, 9, [245, 196, 81, 255]);
  ellipse(png, 266, 253, 7, 7, [245, 196, 81, 255]);
});
save("sleeping.png", (png) => {
  drawSticker(png, source, { scale: 0.94, offsetY: 12 });
  line(png, 236, 72, 268, 72, 7, [245, 196, 81, 245]);
  line(png, 268, 72, 238, 106, 7, [245, 196, 81, 245]);
  line(png, 238, 106, 273, 106, 7, [245, 196, 81, 245]);
  addClosedEyeHint(png);
});
save("angry.png", (png) => {
  drawSticker(png, source);
  line(png, 97, 105, 139, 118, 6, [55, 55, 55, 245]);
  line(png, 181, 118, 223, 105, 6, [55, 55, 55, 245]);
  ellipse(png, 160, 191, 18, 6, [55, 55, 55, 220]);
});
save("dragging.png", (png) => drawSticker(png, source, { scale: 0.97, offsetY: 8 }));

fs.copyFileSync(path.join(outputDir, "idle.png"), path.join(outputDir, "preview.png"));
console.log(`Generated cute dog frames from gpt-image-2 source in ${outputDir}`);
