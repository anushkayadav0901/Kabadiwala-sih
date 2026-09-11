// ---------------------------------------------------------------------------
// CONTACT SHEETS FOR LABEL REVIEW
//
//   node ml/offline/contact-sheet.mjs [classId ...]
//
// Writes one PNG grid per class to ml/experiments/review/. Each tile is the
// exact 224x224 centre crop the model receives (downsampled for display),
// numbered by its position in the sorted file list so rejects can be recorded
// in label-review.json by index.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { decodeImage, tmCrop } from "./image-io.mjs";
import { visualClasses } from "../visual-classes.mjs";

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = path.join(ML, "visual-dataset");
const OUT = path.join(ML, "experiments", "review");

const TILE = 128;
const LABEL_H = 16;
const COLS = 8;
const GAP = 4;

// 3x5 bitmap digits, drawn at 2x.
const GLYPHS = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111",
  4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001",
  8: "111101111101111", 9: "111101111001111",
};

const put = (png, x, y, r, g, b) => {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
};

const drawNumber = (png, n, x, y) => {
  let cx = x;
  for (const ch of String(n)) {
    const bits = GLYPHS[ch];
    for (let gy = 0; gy < 5; gy += 1) for (let gx = 0; gx < 3; gx += 1) {
      if (bits[gy * 3 + gx] !== "1") continue;
      for (let sy = 0; sy < 2; sy += 1) for (let sx = 0; sx < 2; sx += 1) put(png, cx + gx * 2 + sx, y + gy * 2 + sy, 255, 255, 255);
    }
    cx += 8;
  }
};

export const listImages = (classId) => {
  const dir = path.join(DATASET, classId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
};

const sheetFor = (classId) => {
  const files = listImages(classId);
  if (!files.length) return null;
  const rows = Math.ceil(files.length / COLS);
  const png = new PNG({ width: COLS * (TILE + GAP) + GAP, height: rows * (TILE + LABEL_H + GAP) + GAP });
  png.data.fill(40);
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;

  files.forEach((file, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const ox = GAP + col * (TILE + GAP);
    const oy = GAP + row * (TILE + LABEL_H + GAP);
    for (let y = 0; y < LABEL_H; y += 1) for (let x = 0; x < TILE; x += 1) put(png, ox + x, oy + y, 20, 20, 20);
    drawNumber(png, index, ox + 3, oy + 3);
    try {
      const crop = tmCrop(decodeImage(fs.readFileSync(path.join(DATASET, classId, file))), 224);
      const step = 224 / TILE;
      for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) {
        const s = (Math.floor(y * step) * 224 + Math.floor(x * step)) * 3;
        put(png, ox + x, oy + LABEL_H + y, crop[s], crop[s + 1], crop[s + 2]);
      }
    } catch {
      for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) put(png, ox + x, oy + LABEL_H + y, 160, 0, 0);
    }
  });

  fs.mkdirSync(OUT, { recursive: true });
  const target = path.join(OUT, `${classId}.png`);
  fs.writeFileSync(target, PNG.sync.write(png));
  return { target, count: files.length };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const requested = process.argv.slice(2);
  const ids = requested.length ? requested : visualClasses.map((c) => c.id);
  for (const id of ids) {
    const result = sheetFor(id);
    console.log(result ? `${id}: ${result.count} images -> ${path.relative(ML, result.target)}` : `${id}: no images`);
  }
}
