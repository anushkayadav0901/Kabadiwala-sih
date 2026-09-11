// ---------------------------------------------------------------------------
// INTERNET-IMAGE FIELD TEST
//
//   node ml/offline/field-test.mjs download <runDir>   # fetch fresh candidates
//   node ml/offline/field-test.mjs evaluate <runDir>   # score kept images
//
// download: for every trained class, queries Wikimedia Commons with HELD-OUT
// search terms (never used for training), skips any file already present in
// the training dataset by SHA-1, saves up to 6 candidates per class under
// <runDir>/field/<classId>/ and writes a review contact sheet to
// <runDir>/field-review/<classId>.png. Eyeball the sheets and record the
// genuine ones in <runDir>/field/keep.json as { "<classId>": ["file", ...] }.
//
// evaluate: classifies every kept image with the STAGED export (exact app
// preprocessing: 224x224 centre crop, [-1,1]) and reports per-class top-1 /
// top-3 plus the model's answer for every miss. Writes field-results.json.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { decodeImage, tmCrop, IMAGE_SIZE } from "./image-io.mjs";
import { loadExported } from "./export-model.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = path.join(ML, "visual-dataset");

// Held-out queries: intentionally different from every training term in
// visual-classes.mjs so the field images are not the model's training files.
const FIELD_TERMS = {
  newspaper: ["newspaper bundle", "reading newspaper", "newspapers pile"],
  books: ["bookshelf books", "secondhand books", "stack of books"],
  cardboard: ["cardboard boxes pile", "moving boxes", "cardboard sheets"],
  magazine: ["magazines stack", "reading magazine", "old magazines"],
  hard_plastic: ["plastic containers", "plastic chairs", "plastic drums"],
  soft_plastic_film: ["plastic wrap roll", "polythene bags", "cling film"],
  iron_scrap: ["iron and steel recycling", "scrapyard metal", "scrap metal bales"],
  stainless_steel: ["stainless steel pots", "stainless steel cutlery set", "steel bowls"],
  copper_scrap: ["copper tubing", "electrical copper wiring", "copper kettle"],
  aluminium_scrap: ["aluminium cans recycling", "aluminium foil waste", "scrap aluminium metal"],
  brass_scrap: ["brass metal objects", "brass items", "brass ware"],
  ac: ["air conditioning unit", "AC outdoor unit", "air conditioner window"],
  refrigerator: ["fridge kitchen", "refrigerator scrap", "deep freezer"],
  washing_machine: ["laundry washing machine", "washing machine drum", "front load washer"],
  microwave_oven: ["microwave kitchen appliance", "countertop microwave", "microwave oven kitchen"],
  dishwasher: ["dishwasher kitchen", "dishwasher open", "kitchen dishwasher installed"],
  geyser: ["water heater tank", "geyser bathroom", "hot water heater installed"],
  electric_fan: ["ceiling fan", "table fan", "pedestal fan"],
  electric_motor: ["induction motor", "electric motor old", "DC motor scrap"],
  generator: ["electric generator diesel", "generator set power", "portable generator petrol"],
  air_cooler: ["room air cooler", "desert cooler", "window air cooler"],
  inverter: ["home UPS inverter", "solar power inverter wall", "inverter installed home"],
  treadmill: ["treadmill gym", "running machine treadmill", "treadmill home"],
  laptop_screen: ["laptop display", "broken laptop screen", "notebook computer"],
  desktop_cpu: ["computer case PC", "desktop PC case", "computer tower case"],
  crt_monitor: ["old computer monitor CRT", "cathode ray tube monitor", "vintage computer monitor"],
  lcd_led_monitor: ["computer screen monitor", "desktop monitor display", "flat screen monitor"],
  crt_television: ["old TV television", "tube television set", "CRT TV set"],
  printer: ["office printer", "printer scanner copier", "desktop printer"],
  ups: ["UPS power backup", "APC UPS", "UPS computer battery"],
  smartphone: ["mobile phone screen", "smartphone hand", "cell phone"],
  basic_mobile_phone: ["old mobile phone", "keypad phone", "Nokia phone"],
  tablet: ["iPad tablet", "tablet device screen", "e-reader tablet"],
  car: ["car wreck", "abandoned car", "car scrapyard"],
  scooter: ["scooter parking", "Vespa scooter", "moped scooter"],
  motorcycle: ["motorbike", "motorcycle parked", "bike motorcycle"],
  bicycle: ["push bike", "city bicycle", "bicycle parked"],
};

const withTimeout = (promise, ms = 15000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("request timeout")), ms)),
]);
const api = async (params) => {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", origin: "*", ...params });
  const response = await withTimeout(fetch(url));
  if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);
  return response.json();
};
const safe = (value) => value.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 120);
const text = (metadata, key) => metadata?.[key]?.value?.replace(/<[^>]+>/g, "") || "";
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

const datasetSha1s = new Set();
const collectDatasetSha1s = () => {
  if (!fs.existsSync(DATASET)) return;
  for (const classId of fs.readdirSync(DATASET)) {
    const dir = path.join(DATASET, classId);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) if (/\.(jpe?g|png)$/i.test(f)) datasetSha1s.add(sha1(fs.readFileSync(path.join(dir, f))));
  }
};

// --- contact sheet (same layout as contact-sheet.mjs, different root) ------
const TILE = 128, LABEL_H = 16, COLS = 8, GAP = 4;
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
const sheetFor = (dir, outPath) => {
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (!files.length) return 0;
  const rows = Math.ceil(files.length / COLS);
  const png = new PNG({ width: COLS * (TILE + GAP) + GAP, height: rows * (TILE + LABEL_H + GAP) + GAP });
  png.data.fill(40);
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
  files.forEach((file, index) => {
    const ox = GAP + (index % COLS) * (TILE + GAP);
    const oy = GAP + Math.floor(index / COLS) * (TILE + LABEL_H + GAP);
    for (let y = 0; y < LABEL_H; y += 1) for (let x = 0; x < TILE; x += 1) put(png, ox + x, oy + y, 20, 20, 20);
    drawNumber(png, index, ox + 3, oy + 3);
    try {
      const crop = tmCrop(decodeImage(fs.readFileSync(path.join(dir, file))), 224);
      const step = 224 / TILE;
      for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) {
        const s = (Math.floor(y * step) * 224 + Math.floor(x * step)) * 3;
        put(png, ox + x, oy + LABEL_H + y, crop[s], crop[s + 1], crop[s + 2]);
      }
    } catch {
      for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) put(png, ox + x, oy + LABEL_H + y, 160, 0, 0);
    }
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(png));
  return files.length;
};

const [, , command, runDirArg] = process.argv;
const runDir = runDirArg && path.resolve(runDirArg);
if (!command || !runDir || !fs.existsSync(runDir)) {
  console.error("usage: node ml/offline/field-test.mjs <download|evaluate> <runDir>");
  process.exit(1);
}

if (command === "download") {
  collectDatasetSha1s();
  console.log(`dataset SHA-1 set: ${datasetSha1s.size} files`);
  const fieldRoot = path.join(runDir, "field");
  const reviewRoot = path.join(runDir, "field-review");
  fs.mkdirSync(fieldRoot, { recursive: true });
  const attribution = [];
  const only = process.env.CLASS_ONLY ? process.env.CLASS_ONLY.split(",").map((s) => s.trim()) : null;
  for (const [classId, terms] of Object.entries(FIELD_TERMS)) {
    if (only && !only.includes(classId)) continue;
    const classRoot = path.join(fieldRoot, classId);
    fs.rmSync(classRoot, { recursive: true, force: true });
    fs.mkdirSync(classRoot, { recursive: true });
    const results = await Promise.all(terms.map((term) => api({ generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: "40", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "768" }).catch(() => null)));
    const pages = Array.from(results.filter(Boolean).flatMap((r) => Object.values(r.query?.pages || {})).reduce((unique, page) => unique.set(page.title, page), new Map()).values())
      .map((page) => ({ title: page.title, ...(page.imageinfo?.[0] || {}) }))
      .filter((image) => ["image/jpeg", "image/png", "image/webp"].includes(image.mime) && image.width >= 224 && image.height >= 160 && image.thumburl);
    let saved = 0;
    for (const image of pages) {
      if (saved >= 6) break;
      try {
        const response = await withTimeout(fetch(image.thumburl));
        if (!response.ok) continue;
        const buf = Buffer.from(await response.arrayBuffer());
        if (datasetSha1s.has(sha1(buf))) continue; // never test on a training file
        const file = `${String(saved + 1).padStart(3, "0")}_${safe(image.title)}.jpg`;
        fs.writeFileSync(path.join(classRoot, file), buf);
        attribution.push({ class: classId, file, source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(image.title.replaceAll(" ", "_"))}`, license: text(image.extmetadata, "LicenseShortName"), author: text(image.extmetadata, "Artist"), title: image.title });
        saved += 1;
      } catch { /* skip unreadable candidate */ }
    }
    const count = sheetFor(classRoot, path.join(reviewRoot, `${classId}.png`));
    console.log(`${classId}: ${count} fresh candidates`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  fs.writeFileSync(path.join(fieldRoot, "ATTRIBUTION.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), attribution }, null, 2)}\n`);
  console.log(`\nreview the sheets in ${path.relative(ML, reviewRoot)}, then write ${path.relative(ML, path.join(fieldRoot, "keep.json"))}`);
} else if (command === "evaluate") {
  const keepPath = path.join(runDir, "field", "keep.json");
  if (!fs.existsSync(keepPath)) throw new Error("no keep.json — review the field sheets first");
  const keep = JSON.parse(fs.readFileSync(keepPath, "utf8"));
  const metadata = JSON.parse(fs.readFileSync(path.join(runDir, "model", "metadata.json"), "utf8"));
  const labels = metadata.labels;
  const { visualClasses } = await import("../visual-classes.mjs");
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  // predicted label ("Iron Scrap") -> classId ("iron_scrap")
  const labelToClass = new Map(visualClasses.map((c) => [norm(c.label), c.id]));
  const trueClassOf = (label) => labelToClass.get(norm(label));
  await tf.setBackend("cpu");
  await tf.ready();
  const model = await loadExported(path.join(runDir, "model"));

  const results = [];
  for (const [classId, files] of Object.entries(keep)) {
    for (const file of files) {
      const crop = tmCrop(decodeImage(fs.readFileSync(path.join(runDir, "field", classId, file))), IMAGE_SIZE);
      const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
      for (let i = 0; i < pixels.length; i += 1) pixels[i] = crop[i] / 127.5 - 1;
      const probs = tf.tidy(() => model.predict(tf.tensor4d(pixels, [1, IMAGE_SIZE, IMAGE_SIZE, 3])).dataSync());
      const ranked = Array.from(probs).map((p, i) => ({ label: labels[i], p })).sort((a, b) => b.p - a.p);
      results.push({
        class: classId, file,
        top1: ranked[0].label,
        top3: ranked.slice(0, 3).map((r) => `${r.label} ${(r.p * 100).toFixed(0)}%`),
        top3hit: ranked.slice(0, 3).some((r) => trueClassOf(r.label) === classId),
        correct: trueClassOf(ranked[0].label) === classId,
      });
    }
  }
  // per-class summary
  const byClass = {};
  for (const r of results) {
    byClass[r.class] = byClass[r.class] || { n: 0, hits: 0, misses: [] };
    byClass[r.class].n += 1;
    if (r.correct) byClass[r.class].hits += 1;
    else byClass[r.class].misses.push(`${path.basename(r.file)} -> ${r.top1} [${r.top3.join(", ")}]`);
  }  const total = results.length;
  const hits = results.filter((r) => r.correct).length;
  const top3hits = results.filter((r) => r.top3hit).length;
  console.log(`\nfield test: top-1 ${hits}/${total} (${((100 * hits) / total).toFixed(1)}%), top-3 ${top3hits}/${total} (${((100 * top3hits) / total).toFixed(1)}%)`);
  for (const [classId, s] of Object.entries(byClass).sort()) {
    console.log(`  ${classId.padEnd(20)} ${s.hits}/${s.n}${s.misses.length ? "  misses: " + s.misses.join(" | ") : ""}`);
  }
  fs.writeFileSync(path.join(runDir, "field-results.json"), `${JSON.stringify({ total, hits, top3hits, byClass, results }, null, 2)}\n`);
} else {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}


