import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { psClasses, psLabelPolicy } from "../ps-classes.mjs";
import { scanPsDataset, groupPsDataset, splitPsDataset, PS_SPLIT_CONFIG } from "./ps-dataset.mjs";
import { PS_ROOT, PS_REVIEW } from "./ps-data.mjs";
import { extractViews, readView } from "./extract-features.mjs";
import { FEATURE_DIM } from "./head.mjs";
import { trainFastHead, predictFastHead } from "./fast-head.mjs";
import { evaluate, pct } from "./metrics.mjs";
import { assembleModel, saveModel, loadExported, compareToDeployed } from "./export-model.mjs";
import { decodeImage, tmCrop, normalizeInto, IMAGE_SIZE } from "./image-io.mjs";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");
const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYED = path.join(ML, "..", "frontend", "public", "AI_Model");
export const liveFingerprint = () => Object.fromEntries(["model.json", "metadata.json", "weights.bin"].map((file) => [file, crypto.createHash("sha256").update(fs.readFileSync(path.join(DEPLOYED, file))).digest("hex")]));
const hashFile = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const save = (dir, name, data) => fs.writeFileSync(path.join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
const workers = Number(process.env.WORKERS) || 3;
const GRID = [
  { name: "baseline", classWeighting: "none", aug: 4, dropout: 0.5, lr: 0.001, l2: 0.0001, labelSmoothing: 0.1 },
  { name: "sqrt", classWeighting: "sqrt", aug: 4, dropout: 0.5, lr: 0.001, l2: 0.0001, labelSmoothing: 0.1 },
  { name: "balanced", classWeighting: "balanced", aug: 4, dropout: 0.5, lr: 0.001, l2: 0.0001, labelSmoothing: 0.1 },
  { name: "balanced-low-dropout", classWeighting: "balanced", aug: 4, dropout: 0.25, lr: 0.001, l2: 0.0001, labelSmoothing: 0.05 },
  { name: "sqrt-more-views", classWeighting: "sqrt", aug: 8, dropout: 0.35, lr: 0.001, l2: 0.0001, labelSmoothing: 0.05 },
  { name: "balanced-slower", classWeighting: "balanced", aug: 8, dropout: 0.35, lr: 0.0003, l2: 0.0003, labelSmoothing: 0.05 },
];
const maxAug = Math.max(...GRID.map((config) => config.aug));
const priorityLabels = new Set(psClasses.filter((cls) => cls.priority).map((cls) => cls.label));
const priorityF1 = (metrics) => {
  const rows = metrics.perClass.filter((row) => priorityLabels.has(row.label) && row.support);
  return rows.reduce((sum, row) => sum + row.f1, 0) / rows.length;
};
const serializableItems = (items) => items.map(({ dhash, file, ...item }) => ({ ...item, file: path.relative(PS_ROOT, file).replaceAll("\\", "/"), dhash: dhash.toString() }));
const prepare = async () => {
  const run = `ps-run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  const dir = path.join(ML, "experiments", run);
  fs.mkdirSync(dir, { recursive: true });
  save(dir, "live-model-before.json", liveFingerprint());
  const { items, excluded } = scanPsDataset();
  if (!items.length) throw new Error("No reviewed PS data");
  console.log(`${run}: ${items.length} reviewed images; extracting clean features`);
  await extractViews(items.map((item) => ({ sha1: item.sha1, file: item.file, views: ["clean"] })), { label: "PS clean", workers });
  const embeddings = new Map(items.map((item) => [item.sha1, readView(item.sha1, "clean")]));
  const grouped = groupPsDataset(items, excluded, embeddings);
  const classTable = splitPsDataset(grouped.items);
  console.table(classTable.map(({ id, usableImages, groups, train, test, status }) => ({ id, usableImages, groups, train, test, status })));
  save(dir, "dataset.json", { version: 1, policy: psLabelPolicy, config: PS_SPLIT_CONFIG, reviewHash: hashFile(PS_REVIEW), preparedAt: new Date().toISOString(), classTable, excluded, conflicts: grouped.conflicts, groupReasons: grouped.groupReasons, items: serializableItems(grouped.items) });
  save(dir, "search-grid.json", GRID);
  fs.writeFileSync(path.join(PS_ROOT, "latest-run.txt"), dir);
  console.log(`Prepared ${run}. Dataset and test assignments are frozen before training.`);
  return dir;
};
const train = async (dir) => {
  const dataset = JSON.parse(fs.readFileSync(path.join(dir, "dataset.json"), "utf8"));
  if (dataset.reviewHash !== hashFile(PS_REVIEW)) throw new Error("Review changed after split freeze; prepare a new run, do not silently alter the test set");
  if (fs.existsSync(path.join(dir, "metrics.json"))) throw new Error("This run has already evaluated its test set; refusing to tune/re-evaluate in place");
  const grid = JSON.parse(fs.readFileSync(path.join(dir, "search-grid.json"), "utf8"));
  const items = dataset.items.map((item) => ({ ...item, file: path.join(PS_ROOT, item.file) }));
  for (const item of items) if (crypto.createHash("sha1").update(fs.readFileSync(item.file)).digest("hex") !== item.sha1) throw new Error(`Frozen image changed: ${item.file}`);
  const labels = dataset.classTable.filter((cls) => cls.status === "trained").map((cls) => cls.label);
  if (labels.length < 2) throw new Error("Too few eligible classes");
  const trainItems = items.filter((item) => item.split === "train");
  const testItems = items.filter((item) => item.split === "test");
  const labelIndex = new Map(labels.map((label, index) => [label, index]));
  await extractViews(trainItems.map((item) => ({ sha1: item.sha1, file: item.file, views: Array.from({ length: maxAug }, (_, index) => `a${index}`) })), { label: "PS augmentation", workers });
  const xy = (members, aug = 0) => {
    const rows = members.flatMap((item) => [{ ...item, view: "clean" }, ...Array.from({ length: aug }, (_, index) => ({ ...item, view: `a${index}` }))]);
    const features = new Float32Array(rows.length * FEATURE_DIM);
    rows.forEach((row, index) => features.set(readView(row.sha1, row.view), index * FEATURE_DIM));
    return { X: features, y: rows.map((row) => labelIndex.get(row.label)) };
  };
  const cvFile = path.join(dir, "cv-results.json");
  const cv = fs.existsSync(cvFile) ? JSON.parse(fs.readFileSync(cvFile, "utf8")) : [];
  for (const config of grid) {
    if (cv.some((result) => result.name === config.name)) continue;
    const folds = [];
    const pooledProbs = [];
    const pooledTruth = [];
    for (let fold = 0; fold < dataset.config.folds; fold += 1) {
      const training = xy(trainItems.filter((item) => item.fold !== fold), config.aug);
      const validation = xy(trainItems.filter((item) => item.fold === fold));
      if (new Set(training.y).size !== labels.length || new Set(validation.y).size !== labels.length) throw new Error(`A class is missing from fold ${fold}`);
      const head = trainFastHead(training.X, training.y, labels.length, { ...config, maxEpochs: 60, patience: 8 }, validation, 20260912 + fold);
      const probabilities = predictFastHead(head, validation.X, validation.y.length);
      const metrics = evaluate(probabilities, validation.y, labels);
      folds.push({ fold, bestEpoch: head.bestEpoch, top1: metrics.top1, macroF1: metrics.macroF1, priorityF1: priorityF1(metrics) });
      pooledProbs.push(...probabilities.map((row) => Array.from(row)));
      pooledTruth.push(...validation.y);
      console.log(`${config.name} fold ${fold + 1}: top1=${pct(metrics.top1)}, priority F1=${pct(priorityF1(metrics))}, best epoch=${head.bestEpoch}`);
    }
    const metrics = evaluate(pooledProbs, pooledTruth, labels);
    cv.push({ ...config, folds, pooledMetrics: metrics, priorityF1: priorityF1(metrics), meanBestEpoch: folds.reduce((sum, fold) => sum + fold.bestEpoch, 0) / folds.length, probabilities: pooledProbs, truth: pooledTruth });
    save(dir, "cv-results.json", cv);
  }
  const winner = cv.reduce((best, result) => result.priorityF1 > best.priorityF1 ? result : best);
  const config = grid.find((entry) => entry.name === winner.name);
  const epochs = Math.max(1, Math.round(winner.meanBestEpoch));
  save(dir, "selection.json", { criterion: "Pooled out-of-fold macro F1 on PS-priority classes; no test predictions used", config, epochs, validationPriorityF1: winner.priorityF1, validationMetrics: winner.pooledMetrics });
  console.log(`Selected ${winner.name}: validation priority F1 ${pct(winner.priorityF1)}; final ${epochs} epochs`);
  const training = xy(trainItems, config.aug);
  const head = trainFastHead(training.X, training.y, labels.length, { ...config, maxEpochs: epochs }, null, 20260912);
  await tf.setBackend("cpu");
  await tf.ready();
  const modelDir = path.join(dir, "model");
  const model = await assembleModel(head);
  const saved = await saveModel(model, labels, modelDir, { modelName: "kabadiwala-ps-ewaste-specialist", sourceRun: path.basename(dir), labelPolicy: psLabelPolicy, manualOnly: dataset.classTable.filter((cls) => cls.status !== "trained").map((cls) => cls.label) });
  model.dispose();
  const test = xy(testItems);
  const probabilities = predictFastHead(head, test.X, test.y.length);
  const metrics = evaluate(probabilities, test.y, labels);
  const eligibleIndices = testItems.map((item, index) => item.quality.valid ? index : -1).filter((index) => index >= 0);
  const qualityPassed = evaluate(eligibleIndices.map((index) => probabilities[index]), eligibleIndices.map((index) => test.y[index]), labels);
  const predictions = testItems.map((item, index) => ({ file: path.relative(PS_ROOT, item.file).replaceAll("\\", "/"), sha1: item.sha1, label: item.label, classId: item.classId, source: item.source, quality: item.quality, probabilities: Array.from(probabilities[index]) }));
  save(dir, "test-predictions.json", predictions);
  save(dir, "metrics.json", { run: path.basename(dir), labels, dataset: "Visually reviewed Wikimedia candidates; held-out contributor/near-duplicate groups, not a field deployment benchmark", selection: winner.name, priorityF1: priorityF1(metrics), ...metrics, appQualityPassed: qualityPassed, appRetakeCount: testItems.length - eligibleIndices.length });
  const exported = await loadExported(modelDir);
  let maxDiff = 0;
  let labelFlips = 0;
  const samples = labels.flatMap((label) => testItems.filter((item) => item.label === label).slice(0, 2));
  for (const item of samples) {
    const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
    normalizeInto(tmCrop(decodeImage(fs.readFileSync(item.file)), IMAGE_SIZE), pixels, 0);
    const actual = tf.tidy(() => exported.predict(tf.tensor4d(pixels, [1, IMAGE_SIZE, IMAGE_SIZE, 3])).dataSync());
    const expected = probabilities[testItems.indexOf(item)];
    for (let index = 0; index < labels.length; index += 1) maxDiff = Math.max(maxDiff, Math.abs(actual[index] - expected[index]));
    if (actual.indexOf(Math.max(...actual)) !== expected.indexOf(Math.max(...expected))) labelFlips += 1;
  }
  exported.dispose();
  const structure = compareToDeployed(modelDir, DEPLOYED);
  const before = JSON.parse(fs.readFileSync(path.join(dir, "live-model-before.json"), "utf8"));
  const liveUnchanged = JSON.stringify(before) === JSON.stringify(liveFingerprint());
  const passed = maxDiff < 0.001 && labelFlips === 0 && structure.sameLayout && structure.sameBackbone && structure.sameImageSize && structure.samePackage && liveUnchanged;
  save(dir, "export-check.json", { passed, samples: samples.length, maxDiff, labelFlips, structure, liveUnchanged, ...saved });
  if (!passed) throw new Error("Export or live-model integrity check failed");
  console.log(`Held-out: ${pct(metrics.top1)} top-1, ${pct(metrics.top3)} top-3; PS priority F1 ${pct(priorityF1(metrics))}`);
  console.log(`Export parity ${samples.length} samples: max diff ${maxDiff}; live model unchanged. Staged run: ${path.basename(dir)}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command = "all", arg] = process.argv.slice(2);
  if (command === "prepare") await prepare();
  else if (command === "train") {
    const dir = arg ? path.resolve(arg) : fs.readFileSync(path.join(PS_ROOT, "latest-run.txt"), "utf8").trim();
    await train(dir);
  } else if (command === "all") await train(await prepare());
  else throw new Error("Usage: train-ps-model.mjs prepare|train [runDir]|all");
}
