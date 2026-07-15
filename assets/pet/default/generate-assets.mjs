import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const size = 320;
const scale = 4;
const canvasSize = size * scale;

function rgba(hex, alpha = 255) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}

function layer() {
  return new PNG({ width: canvasSize, height: canvasSize, colorType: 6 });
}

function blendPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= canvasSize || y >= canvasSize) return;
  const index = (Math.floor(y) * canvasSize + Math.floor(x)) * 4;
  const sourceAlpha = color[3] / 255;
  const targetAlpha = png.data[index + 3] / 255;
  const alpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (alpha === 0) return;
  for (let channel = 0; channel < 3; channel += 1) {
    png.data[index + channel] = Math.round(
      (color[channel] * sourceAlpha + png.data[index + channel] * targetAlpha * (1 - sourceAlpha)) / alpha
    );
  }
  png.data[index + 3] = Math.round(alpha * 255);
}

function ellipse(png, cx, cy, rx, ry, color) {
  const sx = cx * scale;
  const sy = cy * scale;
  const srx = rx * scale;
  const sry = ry * scale;
  for (let y = Math.floor(sy - sry); y <= Math.ceil(sy + sry); y += 1) {
    for (let x = Math.floor(sx - srx); x <= Math.ceil(sx + srx); x += 1) {
      const dx = (x - sx) / srx;
      const dy = (y - sy) / sry;
      if (dx * dx + dy * dy <= 1) blendPixel(png, x, y, color);
    }
  }
}

function line(png, x1, y1, x2, y2, width, color) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance * scale * 1.5));
  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps;
    ellipse(png, x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio, width / 2, width / 2, color);
  }
}

function downsample(source) {
  const target = new PNG({ width: size, height: size, colorType: 6 });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const sourceIndex = (((y * scale + sy) * canvasSize) + x * scale + sx) * 4;
          for (let channel = 0; channel < 4; channel += 1) totals[channel] += source.data[sourceIndex + channel];
        }
      }
      const targetIndex = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        target.data[targetIndex + channel] = Math.round(totals[channel] / (scale * scale));
      }
    }
  }
  return target;
}

function save(name, draw) {
  const png = layer();
  draw(png);
  fs.writeFileSync(path.join(outputDir, name), PNG.sync.write(downsample(png)));
}

const ink = rgba("#24333A");
const cream = rgba("#FFF8E8");
const white = rgba("#FFFFFF");
const teal = rgba("#36B9B3");
const tealDark = rgba("#168C8A");
const coral = rgba("#F16F61");
const gold = rgba("#F3BE4E");
const pink = rgba("#F49BA6", 165);

save("body.png", (png) => {
  ellipse(png, 160, 158, 104, 112, tealDark);
  ellipse(png, 86, 102, 34, 48, tealDark);
  ellipse(png, 234, 102, 34, 48, tealDark);
  ellipse(png, 89, 105, 20, 31, coral);
  ellipse(png, 231, 105, 20, 31, coral);
  ellipse(png, 160, 164, 92, 106, cream);
  ellipse(png, 72, 196, 28, 48, cream);
  ellipse(png, 248, 196, 28, 48, cream);
  ellipse(png, 116, 267, 35, 23, gold);
  ellipse(png, 204, 267, 35, 23, gold);
  ellipse(png, 160, 139, 72, 61, white);
  ellipse(png, 160, 231, 39, 24, coral);
  ellipse(png, 160, 226, 22, 13, gold);
});

save("eyes-open.png", (png) => {
  ellipse(png, 132, 137, 10, 15, ink);
  ellipse(png, 188, 137, 10, 15, ink);
  ellipse(png, 136, 132, 3, 4, white);
  ellipse(png, 192, 132, 3, 4, white);
});

save("eyes-closed.png", (png) => {
  line(png, 120, 139, 132, 145, 5, ink);
  line(png, 132, 145, 144, 139, 5, ink);
  line(png, 176, 139, 188, 145, 5, ink);
  line(png, 188, 145, 200, 139, 5, ink);
});

save("mouth-smile.png", (png) => {
  line(png, 145, 166, 160, 174, 4, ink);
  line(png, 160, 174, 175, 166, 4, ink);
});

save("mouth-angry.png", (png) => {
  line(png, 146, 174, 160, 166, 4, ink);
  line(png, 160, 166, 174, 174, 4, ink);
  line(png, 120, 122, 143, 129, 4, coral);
  line(png, 177, 129, 200, 122, 4, coral);
});

save("blush.png", (png) => {
  ellipse(png, 110, 164, 18, 9, pink);
  ellipse(png, 210, 164, 18, 9, pink);
});

save("food.png", (png) => {
  ellipse(png, 245, 250, 42, 18, tealDark);
  ellipse(png, 245, 245, 36, 13, coral);
  ellipse(png, 230, 232, 9, 9, gold);
  ellipse(png, 248, 228, 10, 10, gold);
  ellipse(png, 263, 235, 8, 8, gold);
});

save("heart.png", (png) => {
  ellipse(png, 245, 78, 17, 17, coral);
  ellipse(png, 271, 78, 17, 17, coral);
  line(png, 232, 83, 258, 113, 26, coral);
  line(png, 284, 83, 258, 113, 26, coral);
});

save("sleep.png", (png) => {
  ellipse(png, 247, 87, 26, 26, gold);
  ellipse(png, 258, 77, 26, 26, rgba("#000000", 0));
  ellipse(png, 284, 54, 5, 5, teal);
  ellipse(png, 299, 38, 3, 3, coral);
});

const preview = new PNG({ width: size, height: size, colorType: 6 });
for (const file of ["body.png", "eyes-open.png", "mouth-smile.png"]) {
  const source = PNG.sync.read(fs.readFileSync(path.join(outputDir, file)));
  for (let index = 0; index < source.data.length; index += 4) {
    const sourceAlpha = source.data[index + 3] / 255;
    const targetAlpha = preview.data[index + 3] / 255;
    const alpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
    if (alpha === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      preview.data[index + channel] = Math.round(
        (source.data[index + channel] * sourceAlpha + preview.data[index + channel] * targetAlpha * (1 - sourceAlpha)) /
          alpha
      );
    }
    preview.data[index + 3] = Math.round(alpha * 255);
  }
}
fs.writeFileSync(path.join(outputDir, "preview.png"), PNG.sync.write(preview));

console.log(`Generated transparent pet layers in ${outputDir}`);
