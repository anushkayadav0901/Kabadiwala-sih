// ---------------------------------------------------------------------------
// THROWAWAY: browser parity for the specialist model
//
//   node ml/offline/browser-parity-ps.mjs
//
// Same idea as ml/offline/browser-parity.mjs but for the specialist:
// elements come from ml/experiments/ps-data/<id>/ and the model is the one
// staged in ml/experiments/ps-run-*/model/. The page classifies each sample
// with the real @teachablemachine/image 0.8.5 + @tensorflow/tfjs 1.3.1 (the
// exact versions the frontend pins) and reports browser-vs-Node top-1
// agreement. PASS = every sample has the same top-1 label in both runtimes.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { decodeImage, tmCrop, IMAGE_SIZE } from "./image-io.mjs";
import { loadExported } from "./export-model.mjs";
import { psClasses } from "../ps-classes.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ML = path.resolve(HERE, "..");
const DATA = path.join(ML, "experiments", "ps-data");
const LATEST = fs.readFileSync(path.join(DATA, "latest-run.txt"), "utf8").trim();
const runDir = path.join(ML, "experiments", path.basename(LATEST));
if (!fs.existsSync(path.join(runDir, "model"))) {
  console.error(`no specialist model found at ${runDir}`);
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(path.join(runDir, "model", "metadata.json"), "utf8"));
const labels = metadata.labels;
const samples = [];
for (const cls of psClasses) {
  const dir = path.join(DATA, cls.id);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (!files.length) continue;
  samples.push({ id: cls.id, file: path.join(dir, files[Math.floor(files.length / 2)]) });
}

await tf.setBackend("cpu");
await tf.ready();
const model = await loadExported(path.join(runDir, "model"));

const parityDir = path.join(runDir, "parity");
fs.rmSync(parityDir, { recursive: true, force: true });
fs.mkdirSync(parityDir, { recursive: true });
const manifest = [];
for (const s of samples) {
  const name = `${s.id}.jpg`;
  fs.copyFileSync(s.file, path.join(parityDir, name));
  const crop = tmCrop(decodeImage(fs.readFileSync(s.file)), IMAGE_SIZE);
  const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = crop[i] / 127.5 - 1;
  const probs = tf.tidy(() => model.predict(tf.tensor4d(pixels, [1, IMAGE_SIZE, IMAGE_SIZE, 3])).dataSync());
  const ranked = Array.from(probs).map((p, i) => ({ label: labels[i], p })).sort((x, y) => y.p - x.p);
  manifest.push({ image: name, expected: s.id, modelTop1: ranked[0].label, modelTop3: ranked.slice(0, 3).map((r) => `${r.label} ${(r.p * 100).toFixed(0)}%`) });
}
fs.writeFileSync(path.join(parityDir, "parity-data.json"), JSON.stringify(manifest, null, 2));
console.log(`sampled ${manifest.length} elements, model predictions recorded`);

const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>Browser parity - specialist model</title>
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
<h2>Browser parity test - specialist model (real @teachablemachine/image 0.8.5 + tfjs 1.3.1)</h2>
<div id="status">loading model...</div>
<div id="summary"></div>
<table id="results"><tr><th>element</th><th>model top-1</th><th>browser top-1</th><th>top-3 (browser)</th><th>agree</th></tr></table>
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
    const same = ranked[0].label === row.modelTop1;
    if (same) agree++;
    const tr = document.createElement("tr");
    tr.innerHTML = '<td><img src="' + row.image + '"></td><td>' + row.modelTop1 + '</td><td>' + ranked[0].label + '</td><td>' + ranked.slice(0, 3).map((r) => r.label + " " + (r.p * 100).toFixed(0) + "%").join(", ") + '</td><td class="' + (same ? "ok" : "bad") + '">' + (same ? "YES" : "NO") + "</td>";
    table.appendChild(tr);
  }
  document.getElementById("status").textContent = "done";
  document.getElementById("summary").innerHTML = "browser vs model top-1 agreement: <b>" + agree + "/" + data.length + " (" + (100 * agree / data.length).toFixed(1) + "%)</b> " + (agree === data.length ? '<span class="ok">PASS</span>' : '<span class="bad">FAIL</span>');
})();
</script></body></html>`;

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
  fs.writeFileSync(path.join(parityDir, "index.html"), page);
  console.log(`\nparity harness running: http://127.0.0.1:${port}/parity/`);
  console.log("(ctrl+c to stop after checking the page)");
});
