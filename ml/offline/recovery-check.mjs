// ---------------------------------------------------------------------------
// DATASET RECOVERY CHECK
//
//   node ml/offline/recovery-check.mjs
//
// After re-running download-visual-dataset.mjs on a fresh machine, reports how
// many reviewed-kept images came back byte-identical (SHA-1 match) per class.
// Unreviewed extras are harmless — buildDataset() excludes anything not on
// the keep list — but MISSING kept images shrink the training set, so classes
// that recover poorly join the weak-class data collection round.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { listImages } from "./contact-sheet.mjs";
import { loadReview } from "./record-review.mjs";

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = path.join(ML, "visual-dataset");

const review = loadReview();
const rows = [];
let totalKept = 0;
let totalRecovered = 0;

for (const [classId, decision] of Object.entries(review.classes)) {
  const keep = decision.keep || [];
  if (!keep.length) continue;
  const dir = path.join(DATASET, classId);
  const bySha = new Map();
  for (const file of listImages(classId)) {
    const sha1 = crypto.createHash("sha1").update(fs.readFileSync(path.join(dir, file))).digest("hex");
    bySha.set(sha1, file);
  }
  const recovered = keep.filter((k) => bySha.has(k.sha1)).length;
  const extra = listImages(classId).length - recovered;
  totalKept += keep.length;
  totalRecovered += recovered;
  rows.push({ class: classId, reviewed_kept: keep.length, recovered, missing: keep.length - recovered, unreviewed_extra: extra });
}

rows.sort((a, b) => b.missing - a.missing);
console.table(rows);
console.log(`total: ${totalRecovered}/${totalKept} reviewed-kept images recovered byte-identical (${((100 * totalRecovered) / totalKept).toFixed(1)}%)`);
const weak = rows.filter((r) => r.recovered < 8).map((r) => r.class);
if (weak.length) console.log(`classes below the 8-image training floor after recovery: ${weak.join(", ")}`);
