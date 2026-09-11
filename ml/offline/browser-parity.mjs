// ---------------------------------------------------------------------------
// BROWSER PARITY HARNESS
//
//   node ml/offline/browser-parity.mjs <runDir> [port]
//
// Proves the staged export behaves identically inside the real app runtime:
// the page loads the model with the actual @teachablemachine/image 0.8.5 +
// @tensorflow/tfjs 1.3.1 (same versions the frontend pins) and classifies a
// sample of dataset images. A local server is required because tmImage.load
// fetch()es model.json / weights.bin / images, which file:// cannot serve.
//
// The manifest carries Node-side predictions computed with the same export,
// so the page reports browser-vs-Node agreement directly. PASS = every image
// has the same top-1 label in both runtimes.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { decodeImage, tmCrop, IMAGE_SIZE } from "./image-io.mjs";
import { loadExported } from "./export-model.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = path.join(ML, "visual-dataset");

const [, , runDirArg, portArg] = process.argv;
const runDir = runDirArg && path.resolve(runDirArg);
if (!runDir || !fs.existsSync(path.join(runDir, "model"))) {
  console.error("usage: node ml/offline/browser-parity.mjs <runDir> [port]");
  process.exit(1);
}

// --- sample images across classes -------------------------------------------
const { visualClasses } = await import("../visual-classes.mjs");
const samples = [];
for (const cls of visualClasses) {
  const dir = path.join(DATASET, cls.id);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (!files.length) continue;
  samples.push({ classId: cls.id, label: cls.label, file: path.join(dir, files[Math.floor(files.length / 2)]) }); // middle image, deterministic
}

// --- node-side predictions with the staged export ---------------------------
const labels = JSON.parse(fs.readFileSync(path.join(runDir, "model", "metadata.json"), "utf8")).labels;
await tf.setBackend("cpu");
await tf.ready();
const model = await loadExported(path.join(runDir, "model"));

const parityDir = path.join(runDir, "parity");
fs.rmSync(parityDir, { recursive: true, force: true });
fs.mkdirSync(parityDir, { recursive: true });
const manifest = [];
for (const s of samples) {
  const name = `${s.classId}.jpg`;
  fs.copyFileSync(s.file, path.join(parityDir, name));
  const crop = tmCrop(decodeImage(fs.readFileSync(s.file)), IMAGE_SIZE);
  const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = crop[i] / 127.5 - 1;
  const probs = tf.tidy(() => model.predict(tf.tensor4d(pixels, [1, IMAGE_SIZE, IMAGE_SIZE, 3])).dataSync());
  const ranked = Array.from(probs).map((p, i) => ({ label: labels[i], p })).sort((a, b) => b.p - a.p);
  manifest.push({ image: name, expected: s.label, nodeTop1: ranked[0].label, nodeTop3: ranked.slice(0, 3).map((r) => `${r.label} ${(r.p * 100).toFixed(0)}%`) });
}
fs.writeFileSync(path.join(parityDir, "parity-data.json"), JSON.stringify(manifest, null, 2));
console.log(`sampled ${manifest.length} images (one per class), node predictions recorded`);

const pageFor = (port) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Browser parity - staged model</title>
<script src="https://unpkg.com/@tensorflow/tfjs@1.3.1/dist/tf.min.js"></script>
<script src="https://unpkg.com/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js"></script>
<style>
body{font-family:system-ui;margin:24px;background:#111;color:#eee}
table{border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #444;padding:6px 10px;font-size:14px}
img{width:96px;height:96px;object-fit:cover;display:block}
.ok{color:#4ade80}.bad{color:#f87171;font-weight:700}
#summary{margin-top:12px;font-size:16px}
</style></head><body>
<h2>Browser parity test (real @teachablemachine/image 0.8.5 + tfjs 1.3.1)</h2>
<div id="status">loading model...</div>
<div id="summary"></div>
<table id="results"><tr><th>image</th><th>expected</th><th>node top-1</th><th>browser top-1</th><th>top-3 (browser)</th><th>agree</th></tr></table>
<script>
(async () => {
  const meta = await (await fetch("../model/metadata.json")).json();
  const model = await tmImage.load("../model/", meta);
  const data = await (await fetch("parity-data.json")).json();
  const table = document.getElementById("results");
  let agree = 0;
  for (const row of data) {
    const img = new Image();
    img.src = row.image;
    await img.decode();
    const probs = await model.predict(img);
    const ranked = probs.map((p) => ({ label: p.className, p: p.probability })).sort((a, b) => b.p - a.p);
    const same = ranked[0].label === row.nodeTop1;
    if (same) agree++;
    const tr = document.createElement("tr");
    tr.innerHTML = '<td><img src="' + row.image + '"></td><td>' + row.expected + '</td><td>' + row.nodeTop1 + '</td><td>' + ranked[0].label + '</td><td>' + ranked.slice(0, 3).map((r) => r.label + " " + (r.p * 100).toFixed(0) + "%").join(", ") + '</td><td class="' + (same ? "ok" : "bad") + '">' + (same ? "YES" : "NO") + "</td>";
    table.appendChild(tr);
  }
  document.getElementById("status").textContent = "done";
  document.getElementById("summary").innerHTML = "browser vs node top-1 agreement: <b>" + agree + "/" + data.length + " (" + (100 * agree / data.length).toFixed(1) + "%)</b> " + (agree === data.length ? '<span class="ok">PASS</span>' : '<span class="bad">FAIL</span>');
})();
</script></body></html>`;

// --- tiny static server ------------------------------------------------------
const MIME = { ".html": "text/html", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".bin": "application/octet-stream" };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(runDir, urlPath);
  if (urlPath.endsWith("/")) file = path.join(file, urlPath.includes("/model/") ? "model.json" : "index.html");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  fs.writeFileSync(path.join(parityDir, "index.html"), pageFor(port));
  console.log(`\nparity harness running: http://127.0.0.1:${port}/parity/`);
  console.log(`model served from:      http://127.0.0.1:${port}/model/`);
  console.log("(ctrl+c to stop after checking the page)");
});



