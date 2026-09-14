// ---------------------------------------------------------------------------
// COMBINED TRAINING ORCHESTRATOR (broad 37 + PS-critical specialist data)
//
//   node ml/offline/train-combined.mjs
//
// One model, 42 labels:
//   - all 37 broad classes, same review keep-list + 8/4 eligibility floor as
//     the proven broad run (nothing previously trained is dropped),
//   - PS specialist data merged into the 3 broad classes whose visual
//     definition it matches exactly (Copper Scrap, LCD/LED Monitor,
//     Electric Motor) — more reviewed data for the same concept,
//   - 5 new labels from the specialist: Cables, PCB, Battery, Magnet
//     Assembly, Mixed E-waste (each >=26 kept images, above the
//     specialist's own 20/8 floor).
//
// Deliberately NOT added from the specialist:
//   - CRT (mixes CRT TVs and monitors; the broad model splits crt_monitor vs
//     crt_television, so merging would poison that boundary),
//   - Other Metal Scrap (mixes brass/aluminium/iron; the broad model trains
//     brass_scrap, aluminium_scrap and iron_scrap separately),
//   - E-waste Plastic (18 kept from 48 candidates; below the specialist's
//     own 20-image floor, already excluded from the specialist model).
//
// Stages the export in ml/experiments/<run>/model/; nothing in frontend/ is
// modified. Publish only by human review of metrics.json.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { visualClasses } from "../visual-classes.mjs";
import { psClasses } from "../ps-classes.mjs";
import { buildDataset, resolvePerceptualConflicts, assignGroups, splitGroups } from "./dataset.mjs";
import { PS_ROOT, loadPsManifest, loadPsReview } from "./ps-data.mjs";
import { extractViews, readView } from "./extract-features.mjs";
import { trainFastHead, predictFastHead } from "./fast-head.mjs";
import { FEATURE_DIM } from "./head.mjs";
import { evaluate, pct } from "./metrics.mjs";
import { assembleModel, saveModel, loadExported, compareToDeployed } from "./export-model.mjs";
import { decodeImage, tmCrop, normalizeInto, IMAGE_SIZE, dHash } from "./image-io.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYED = path.join(ML, "..", "frontend", "public", "AI_Model");

// The grid mirrors the broad run: 9 configs x 5 folds on cached embeddings.
const GRID = [
  ...[8, 16, 24].map((aug) => ({ classWeighting: "none", aug })),
  ...[8, 16, 24].map((aug) => ({ classWeighting: "sqrt", aug })),
  ...[8, 16, 24].map((aug) => ({ classWeighting: "balanced", aug })),
];
const MAX_AUG = Math.max(...GRID.map((g) => g.aug));

const run = `combined-run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
const RUN_DIR = path.join(ML, "experiments", run);
fs.mkdirSync(RUN_DIR, { recursive: true });
const saveJson = (name, data) => fs.writeFileSync(path.join(RUN_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
console.log(`run directory: ${path.relative(ML, RUN_DIR)}`);

// --- Combined class policy --------------------------------------------------
// PS data joins the broad class with this id when its reviewed definition
// matches; otherwise it becomes a new ps_ label or is dropped.
const MERGE_INTO = { copper_scrap: "copper_scrap", lcd: "lcd_led_monitor", motors: "electric_motor" };
const DROP = ["crt", "other_metal", "ewaste_plastic"];
const combinedClasses = [
  ...visualClasses.map((vc) => ({ id: vc.id, label: vc.label, source: "visual", psSources: [] })),
  ...psClasses
    .filter((pc) => !MERGE_INTO[pc.id] && !DROP.includes(pc.id))
    .map((pc) => ({ id: `ps_${pc.id}`, label: pc.label, source: "ps", psSources: [pc.id] })),
];
for (const pc of psClasses.filter((p) => MERGE_INTO[p.id])) {
  const target = combinedClasses.find((c) => c.id === MERGE_INTO[pc.id]);
  target.psSources.push(pc.id);
}
console.log(`combined labels: ${combinedClasses.length}`);
for (const c of combinedClasses.filter((x) => x.psSources.length)) console.log(`  ${c.id}: broad + PS [${c.psSources.join(", ")}]`);
saveJson("combined-classes.json", combinedClasses);

// --- 1. broad dataset -------------------------------------------------------
console.log("\n[1/9] building broad dataset (review keep-list + app quality gate)");
const { items, excluded, conflicts, perClass, config } = buildDataset();
const exclusionReasons = {};
for (const e of excluded) exclusionReasons[e.reason.split(":")[0]] = (exclusionReasons[e.reason.split(":")[0]] || 0) + 1;
console.log(`  ${items.length} images kept, ${excluded.length} excluded`, exclusionReasons);
if (conflicts.length) console.log(`  ${conflicts.length} byte-identical cross-class conflicts dropped`);

// --- 2. PS specialist dataset ----------------------------------------------
console.log("\n[2/9] loading reviewed PS specialist data");
const psReview = loadPsReview();
const psBySha = new Map();
for (const image of loadPsManifest().images) psBySha.set(`${image.classId}:${image.sha1}`, image);
const psItems = [];
let psKept = 0;
let psExcluded = 0;
const psAdded = new Set();
for (const pc of psClasses) {
  if (DROP.includes(pc.id)) { console.log(`  ${pc.id}: dropped by policy`); continue; }
  const combinedId = MERGE_INTO[pc.id] || `ps_${pc.id}`;
  for (const [key, image] of psBySha) {
    if (!key.startsWith(`${pc.id}:`)) continue;
    const decision = psReview.decisions[key];
    if (!decision?.keep) { psExcluded += 1; continue; }
    if (psAdded.has(key)) continue;
    psAdded.add(key);
    const file = path.join(PS_ROOT, image.file);
    const bytes = fs.readFileSync(file);
    if (crypto.createHash("sha1").update(bytes).digest("hex") !== image.sha1) throw new Error(`Reviewed image changed: ${image.file}`);
    const decoded = decodeImage(bytes);
    psItems.push({
      classId: combinedId,
      label: pc.label,
      sha1: image.sha1,
      file,
      name: path.basename(image.file),
      dhash: dHash(decoded),
      series: null,
      width: decoded.width,
      height: decoded.height,
      source: "ps",
    });
    psKept += 1;
  }
}
console.log(`  ${psKept} reviewed PS images loaded, ${psExcluded} removed/unreviewed`);
saveJson("ps-load-report.json", { kept: psKept, removed: psExcluded, byClass: [...psAdded].reduce((m, k) => { const cls = k.split(":")[0]; m[cls] = (m[cls] || 0) + 1; return m; }, {}) });

// --- 3. merge ---------------------------------------------------------------
console.log("\n[3/9] merging datasets");
const allItems = [...items, ...psItems];
const allExcluded = [...excluded];
const labelOf = Object.fromEntries(combinedClasses.map((c) => [c.id, c.label]));

// --- 4. clean features ------------------------------------------------------
console.log("\n[4/9] extracting clean 224x224 centre-crop embeddings");
await extractViews(allItems.map((it) => ({ sha1: it.sha1, file: it.file, views: ["clean"] })), { label: "clean views", workers: 3 });
const embeddings = new Map(allItems.map((it) => [it.sha1, readView(it.sha1, "clean")]));

// --- 5. conflicts + groups + splits (same config as the broad run) ---------
console.log("\n[5/9] resolving cross-class perceptual conflicts");
const { items: clean, rejectedByEmbedding } = resolvePerceptualConflicts(allItems, allExcluded, embeddings, config);
console.log(`  ${allItems.length - clean.length} dropped as cross-class visual duplicates (${rejectedByEmbedding.length} dHash collisions cleared by embeddings)`);

console.log("\n  grouping near-duplicates/series and splitting (whole groups to test)");
const groupReasons = assignGroups(clean, config, embeddings);
const { eligible, ineligible } = splitGroups(clean, config);
console.log("  groups merged by:", groupReasons);

const classTable = [];
for (const cls of combinedClasses) {
  const members = clean.filter((m) => m.classId === cls.id);
  const groups = new Set(members.map((m) => m.group)).size;
  const test = members.filter((m) => m.split === "test").length;
  const train = members.filter((m) => m.split === "train").length;
  classTable.push({
    id: cls.id, label: cls.label, source: cls.source,
    kept: members.length, groups, train, test,
    status: eligible.includes(cls.id) ? "trained" : members.length ? "EXCLUDED (too little clean data)" : "EXCLUDED (no clean images)",
  });
}
console.table(classTable.map(({ id, label, source, kept, groups, train, test, status }) => ({ class: id, label, source, kept, groups, train, test, status })));
saveJson("class-table.json", { classTable, ineligible, config });

if (eligible.length < 2) throw new Error("fewer than 2 eligible classes — cannot train");
const labels = eligible.map((id) => labelOf[id]);
const classIndex = new Map(eligible.map((id, i) => [id, i]));
console.log(`  ${eligible.length} classes trainable, ${ineligible.length} excluded for lack of clean data`);

// --- 6. augmented views -----------------------------------------------------
const trainItems = clean.filter((m) => m.split === "train");
console.log(`\n[6/9] extracting ${MAX_AUG} augmented views per train image (${trainItems.length} images)`);
await extractViews(
  trainItems.map((it) => ({ sha1: it.sha1, file: it.file, views: Array.from({ length: MAX_AUG }, (_, i) => `a${i}`) })),
  { label: "augmented views", workers: 3 }
);

const matrixFor = (rows) => {
  const X = new Float32Array(rows.length * FEATURE_DIM);
  rows.forEach((r, i) => X.set(readView(r.sha1, r.view), i * FEATURE_DIM));
  return X;
};
const trainRowsFor = (folds, aug) =>
  trainItems.filter((m) => folds.includes(m.fold)).flatMap((m) =>
    [{ sha1: m.sha1, view: "clean", cls: classIndex.get(m.classId) },
     ...Array.from({ length: aug }, (_, i) => ({ sha1: m.sha1, view: `a${i}`, cls: classIndex.get(m.classId) }))]);
const cleanRowsFor = (members) => members.map((m) => ({ sha1: m.sha1, view: "clean", cls: classIndex.get(m.classId) }));
const xy = (rows) => ({ X: matrixFor(rows), y: rows.map((r) => r.cls) });

// --- 7. cross-validation ----------------------------------------------------
const folds = [...new Set(trainItems.map((m) => m.fold))].sort();
console.log(`\n[7/9] ${folds.length}-fold cross-validation over ${GRID.length} configs`);
const cvResults = [];
for (const cfg of GRID) {
  const foldAccs = [];
  const bestEpochs = [];
  for (const f of folds) {
    const train = xy(trainRowsFor(folds.filter((x) => x !== f), cfg.aug));
    const val = xy(cleanRowsFor(trainItems.filter((m) => m.fold === f)));
    const head = trainFastHead(train.X, train.y, labels.length, { classWeighting: cfg.classWeighting }, val, 1000 + f);
    const probs = predictFastHead(head, val.X, val.y.length);
    const acc = probs.filter((p, i) => p.indexOf(Math.max(...p)) === val.y[i]).length / val.y.length;
    foldAccs.push(acc);
    bestEpochs.push(head.bestEpoch);
  }
  const mean = foldAccs.reduce((s, v) => s + v, 0) / foldAccs.length;
  cvResults.push({ ...cfg, foldAccs: foldAccs.map((v) => Number(v.toFixed(4))), meanAcc: mean, meanBestEpoch: bestEpochs.reduce((s, v) => s + v, 0) / bestEpochs.length });
  console.log(`  ${cfg.classWeighting.padEnd(8)} aug=${String(cfg.aug).padStart(2)}  folds=${foldAccs.map((v) => pct(v)).join(" ")}  mean=${pct(mean)}  bestEpoch~${Math.round(cvResults[cvResults.length - 1].meanBestEpoch)}`);
}
saveJson("cv-results.json", cvResults);
const winner = cvResults.reduce((a, b) => (b.meanAcc > a.meanAcc ? b : a));
console.log(`  winner: classWeighting=${winner.classWeighting}, aug=${winner.aug}, mean CV accuracy ${pct(winner.meanAcc)}`);

// --- 8. final head + held-out test ------------------------------------------
const finalEpochs = Math.max(10, Math.round(winner.meanBestEpoch));
console.log(`\n[8/9] training final head on all ${trainItems.length} train images (${finalEpochs} epochs, from CV)`);
const fullTrain = xy(trainRowsFor(folds, winner.aug));
const finalHead = trainFastHead(fullTrain.X, fullTrain.y, labels.length, { classWeighting: winner.classWeighting, maxEpochs: finalEpochs }, null, 20260911);

const testItems = clean.filter((m) => m.split === "test");
console.log(`  evaluating ONCE on the held-out test set (${testItems.length} images, clean views)`);
const test = xy(cleanRowsFor(testItems));
const testProbs = predictFastHead(finalHead, test.X, test.y.length);
const metrics = evaluate(testProbs, test.y, labels);
console.log(`  top-1 ${pct(metrics.top1)} (95% CI ${pct(metrics.top1CI[0])}-${pct(metrics.top1CI[1])}), top-3 ${pct(metrics.top3)}, macro-F1 ${pct(metrics.macroF1)}`);
console.log(`  app auto-accept: coverage ${pct(metrics.autoAccept.coverage)}, precision ${pct(metrics.autoAccept.precision)}, wrong auto-accepts ${metrics.autoAccept.wrongAutoAccepts}`);
saveJson("metrics.json", {
  run, config: { classWeighting: winner.classWeighting, aug: winner.aug, epochs: finalEpochs, grid: GRID },
  labels, testSize: metrics.n,
  top1: metrics.top1, top1CI: metrics.top1CI, top3: metrics.top3,
  macroF1: metrics.macroF1, macroRecall: metrics.macroRecall, autoAccept: metrics.autoAccept,
  perClass: metrics.perClass, confusion: metrics.confusion, topConfusions: metrics.topConfusions,
  classTable,
});

// --- 9. staged export + parity ----------------------------------------------
console.log("\n[9/9] exporting staged Teachable-Machine model and checking parity");
const modelDir = path.join(RUN_DIR, "model");
const model = await assembleModel(finalHead);
const saved = await saveModel(model, labels, modelDir, { sourceRun: run });
console.log(`  wrote ${path.relative(ML, modelDir)} (${(saved.weightBytes / 1024 / 1024).toFixed(2)} MB, ${saved.tensors} tensors)`);

const reloaded = await loadExported(modelDir);
const sample = testItems.filter((_, i) => i % Math.ceil(testItems.length / 12) === 0).slice(0, 12);
const pixels = new Float32Array(sample.length * IMAGE_SIZE * IMAGE_SIZE * 3);
sample.forEach((m, i) => normalizeInto(tmCrop(decodeImage(fs.readFileSync(m.file)), IMAGE_SIZE), pixels, i * IMAGE_SIZE * IMAGE_SIZE * 3));
const exportedProbs = tf.tidy(() => {
  const out = reloaded.predict(tf.tensor4d(pixels, [sample.length, IMAGE_SIZE, IMAGE_SIZE, 3]));
  const data = out.dataSync();
  return Array.from({ length: sample.length }, (_, i) => data.slice(i * labels.length, (i + 1) * labels.length));
});
const headProbs = predictFastHead(finalHead, matrixFor(cleanRowsFor(sample)), sample.length);
let maxProbDiff = 0;
let labelFlips = 0;
exportedProbs.forEach((row, i) => {
  for (let c = 0; c < labels.length; c += 1) maxProbDiff = Math.max(maxProbDiff, Math.abs(row[c] - headProbs[i][c]));
  const argmax = (r) => r.indexOf(Math.max(...r));
  if (argmax(row) !== argmax(Array.from(headProbs[i]))) labelFlips += 1;
});
console.log(`  numerical parity on ${sample.length} test images: max prob diff ${maxProbDiff.toExponential(2)}, label flips ${labelFlips}`);
if (labelFlips > 0 || maxProbDiff > 1e-3) throw new Error("exported model does not reproduce head predictions — do NOT publish");

const structural = compareToDeployed(modelDir, DEPLOYED);
console.log("  structural check vs deployed model:", JSON.stringify({ sameLayout: structural.sameLayout, sameBackbone: structural.sameBackbone, sameImageSize: structural.sameImageSize, samePackage: structural.samePackage }));
saveJson("export-check.json", structural);
if (!structural.sameLayout || !structural.sameBackbone || !structural.sameImageSize || !structural.samePackage) {
  throw new Error("staged export does not match the deployed model layout — do NOT publish");
}
console.log(`\ndone. Combined 42-label model: held-out top-1 ${pct(metrics.top1)}; staged at ${path.relative(ML, modelDir)}`);
console.log("Publish manually only after reviewing metrics.json (nothing in frontend/ was modified).");
