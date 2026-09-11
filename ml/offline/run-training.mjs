// ---------------------------------------------------------------------------
// TRAINING RUN ORCHESTRATOR
//
//   node ml/offline/run-training.mjs [--quick]
//
// Ties the verified modules into one reproducible run:
//   1. buildDataset()        review keep-list + app quality gate + sha1 conflicts
//   2. clean feature views   frozen MobileNetV2 embeddings for every survivor
//   3. perceptual conflicts  cross-class near-duplicates dropped (embedding-confirmed)
//   4. groups + splits       leakage-safe: whole groups to test, folds for CV
//   5. augmented views       K deterministic training views per train image
//   6. 5-fold CV             classWeighting x K grid, early stopping per fold
//   7. final head            all train data, epochs = CV mean best epoch
//   8. held-out test         evaluated ONCE, clean views only
//   9. staged export         ml/experiments/<run>/model/ + parity checks
//
// Nothing here touches frontend/. The staged model is published only by a
// human copying it into frontend/public/AI_Model/ after reviewing metrics.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDataset, resolvePerceptualConflicts, assignGroups, splitGroups } from "./dataset.mjs";
import { extractViews, readView } from "./extract-features.mjs";
import { trainFastHead, predictFastHead } from "./fast-head.mjs";
import { FEATURE_DIM } from "./head.mjs";
import { evaluate, pct } from "./metrics.mjs";
import { assembleModel, saveModel, loadExported, compareToDeployed } from "./export-model.mjs";
import { decodeImage, tmCrop, normalizeInto, IMAGE_SIZE } from "./image-io.mjs";
import { visualClasses } from "../visual-classes.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYED = path.join(ML, "..", "frontend", "public", "AI_Model");
const QUICK = process.argv.includes("--quick");

// The grid is deliberately small: 9 configs x 5 folds on ~15k cached
// embeddings. --quick runs only the two most promising extremes.
const GRID = QUICK
  ? [{ classWeighting: "sqrt", aug: 16 }]
  : [
      ...[8, 16, 24].map((aug) => ({ classWeighting: "none", aug })),
      ...[8, 16, 24].map((aug) => ({ classWeighting: "sqrt", aug })),
      ...[8, 16, 24].map((aug) => ({ classWeighting: "balanced", aug })),
    ];
const MAX_AUG = Math.max(...GRID.map((g) => g.aug));

const run = `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
const RUN_DIR = path.join(ML, "experiments", run);
fs.mkdirSync(RUN_DIR, { recursive: true });
const saveJson = (name, data) => fs.writeFileSync(path.join(RUN_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
console.log(`run directory: ${path.relative(ML, RUN_DIR)}`);

// --- 1. dataset ------------------------------------------------------------
console.log("\n[1/9] building dataset (review keep-list + app quality gate)");
const { items, excluded, conflicts, perClass, config } = buildDataset();
const exclusionReasons = {};
for (const e of excluded) exclusionReasons[e.reason.split(":")[0]] = (exclusionReasons[e.reason.split(":")[0]] || 0) + 1;
console.log(`  ${items.length} images kept, ${excluded.length} excluded`, exclusionReasons);
if (conflicts.length) console.log(`  ${conflicts.length} byte-identical cross-class conflicts dropped`);

// --- 2. clean features -----------------------------------------------------
console.log("\n[2/9] extracting clean 224x224 centre-crop embeddings");
await extractViews(items.map((it) => ({ sha1: it.sha1, file: it.file, views: ["clean"] })), { label: "clean views" });
const embeddings = new Map(items.map((it) => [it.sha1, readView(it.sha1, "clean")]));

// --- 3 + 4. conflicts, groups, splits --------------------------------------
console.log("\n[3/9] resolving perceptual cross-class conflicts");
const { items: clean, rejectedByEmbedding } = resolvePerceptualConflicts(items, excluded, embeddings, config);
console.log(`  ${items.length - clean.length} dropped as cross-class visual duplicates (${rejectedByEmbedding.length} dHash collisions cleared by embeddings)`);

console.log("\n[4/9] grouping near-duplicates/series and splitting (whole groups to test)");
const groupReasons = assignGroups(clean, config, embeddings);
const { eligible, ineligible } = splitGroups(clean, config);
console.log("  groups merged by:", groupReasons);
const labelOf = Object.fromEntries(visualClasses.map((c) => [c.id, c.label]));

const classTable = [];
for (const cls of visualClasses) {
  const members = clean.filter((m) => m.classId === cls.id);
  const groups = new Set(members.map((m) => m.group)).size;
  const test = members.filter((m) => m.split === "test").length;
  const train = members.filter((m) => m.split === "train").length;
  classTable.push({
    id: cls.id, label: cls.label,
    kept: members.length, groups, train, test,
    status: eligible.includes(cls.id) ? "trained" : members.length ? "EXCLUDED (too little clean data)" : "EXCLUDED (no clean images)",
  });
}
console.table(classTable.map(({ id, kept, groups, train, test, status }) => ({ class: id, kept, groups, train, test, status })));
saveJson("dataset-report.json", { perClass, classTable, ineligible, exclusionReasons, rejectedByEmbedding: rejectedByEmbedding.slice(0, 50) });

if (eligible.length < 2) throw new Error("fewer than 2 eligible classes — cannot train");
const labels = eligible.map((id) => labelOf[id]);
const classIndex = new Map(eligible.map((id, i) => [id, i]));
console.log(`  ${eligible.length} classes trainable, ${ineligible.length} excluded for lack of clean data`);

// --- 5. augmented views ----------------------------------------------------
const trainItems = clean.filter((m) => m.split === "train");
console.log(`\n[5/9] extracting ${MAX_AUG} augmented views per train image (${trainItems.length} images)`);
await extractViews(
  trainItems.map((it) => ({ sha1: it.sha1, file: it.file, views: Array.from({ length: MAX_AUG }, (_, i) => `a${i}`) })),
  { label: "augmented views" }
);

// Feature matrix helpers: rows = views of given items.
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

// --- 6. cross-validation ---------------------------------------------------
const folds = [...new Set(trainItems.map((m) => m.fold))].sort();
console.log(`\n[6/9] ${folds.length}-fold cross-validation over ${GRID.length} configs`);
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

// --- 7. final head ---------------------------------------------------------
const finalEpochs = Math.max(10, Math.round(winner.meanBestEpoch));
console.log(`\n[7/9] training final head on all ${trainItems.length} train images (${finalEpochs} epochs, from CV)`);
const fullTrain = xy(trainRowsFor(folds, winner.aug));
const finalHead = trainFastHead(fullTrain.X, fullTrain.y, labels.length, { classWeighting: winner.classWeighting, maxEpochs: finalEpochs }, null, 20260911);

// --- 8. held-out test (once) -----------------------------------------------
const testItems = clean.filter((m) => m.split === "test");
console.log(`\n[8/9] evaluating ONCE on the held-out test set (${testItems.length} images, clean views)`);
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
});

// --- 9. staged export + parity ----------------------------------------------
console.log("\n[9/9] exporting staged Teachable-Machine model and checking parity");
const modelDir = path.join(RUN_DIR, "model");
const model = await assembleModel(finalHead);
const saved = await saveModel(model, labels, modelDir, { sourceRun: run });
console.log(`  wrote ${path.relative(ML, modelDir)} (${(saved.weightBytes / 1024 / 1024).toFixed(2)} MB, ${saved.tensors} tensors)`);

// (a) exported graph must reproduce the head's predictions. The exported
// model takes raw 224x224 crops, so re-run the exact app preprocessing for a
// sample of test images and compare probabilities end to end.
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

// (b) structure must match what the app already loads
const structural = compareToDeployed(modelDir, DEPLOYED);
console.log("  structural check vs deployed model:", JSON.stringify({ sameLayout: structural.sameLayout, sameBackbone: structural.sameBackbone, sameImageSize: structural.sameImageSize, samePackage: structural.samePackage }));
saveJson("export-check.json", structural);
if (!structural.sameLayout || !structural.sameBackbone || !structural.sameImageSize || !structural.samePackage) {
  throw new Error("staged export does not match the deployed model layout — do NOT publish");
}
console.log(`\ndone. Held-out top-1 ${pct(metrics.top1)}; staged model at ${path.relative(ML, modelDir)}`);
console.log("Publish manually only after reviewing metrics.json (nothing in frontend/ was modified).");
