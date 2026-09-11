// ---------------------------------------------------------------------------
// DATASET: REVIEW FILTER, QUALITY GATE, CONFLICTS, LEAKAGE-SAFE SPLITS
//
// The previous trainer split images independently. That is only safe when
// every image is independent, which this Commons-derived data is not: it holds
// exact duplicates, one photographer's numbered series, and the same file
// filed under several classes. Independent splitting lets near-copies land on
// both sides of the train/test line, so the test score measures memorisation.
//
// Here every image joins a GROUP (exact duplicates, perceptual near-duplicates,
// same upload series, near-identical embeddings) and whole groups are split.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { decodeImage, dHash, hamming, mulberry32 } from "./image-io.mjs";
import { listImages } from "./contact-sheet.mjs";
import { loadReview } from "./record-review.mjs";
import { visualClasses } from "../visual-classes.mjs";

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = path.join(ML, "visual-dataset");

export const DEFAULTS = {
  seed: 20260911,
  testFraction: 0.2,
  folds: 5,
  minKept: 8,            // below this a class cannot be both trained and tested
  minGroups: 4,          // independent groups needed for >=1 test group and a train set
  nearDupHamming: 8,     // within a class: grouped together
  conflictHamming: 5,    // across classes: treated as the same image
  embedDupCosine: 0.95,  // raw embeddings are weakly discriminative, so only near-copies
};

// --- the app's own inference-time quality gate ----------------------------
// Mirrors checkImageQuality() in frontend/src/services/estimateService.js: the
// whole image stretched to 64x64, then size, brightness and variance limits.
// An image the app refuses to classify is not a useful training example.
export const appQualityGate = (img) => {
  const size = 64;
  const { width: w, height: h, data } = img;
  const luma = new Float64Array(size * size);
  for (let y = 0; y < size; y += 1) {
    const y0 = (y * h) / size; const y1 = ((y + 1) * h) / size;
    for (let x = 0; x < size; x += 1) {
      const x0 = (x * w) / size; const x1 = ((x + 1) * w) / size;
      let sum = 0; let n = 0;
      for (let yy = Math.floor(y0); yy < Math.max(Math.ceil(y1), Math.floor(y0) + 1) && yy < h; yy += 1) {
        for (let xx = Math.floor(x0); xx < Math.max(Math.ceil(x1), Math.floor(x0) + 1) && xx < w; xx += 1) {
          const p = (yy * w + xx) * 4;
          sum += data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
          n += 1;
        }
      }
      luma[y * size + x] = sum / n;
    }
  }
  const average = luma.reduce((s, v) => s + v, 0) / luma.length;
  const variance = luma.reduce((s, v) => s + (v - average) ** 2, 0) / luma.length;
  const reasons = [];
  if (w < 224 || h < 160) reasons.push("too small");
  if (average < 28) reasons.push("too dark");
  if (average > 238) reasons.push("overexposed");
  if (variance < 180) reasons.push("near-uniform frame");
  return { valid: reasons.length === 0, reasons, average, variance };
};

// Numbered uploads from one photographer share a title once digits are masked:
//   MITSUBISHI_..._OUTDOOR_UNIT_14_  /  Meccano_Magazine_1925-01_cover
// Requiring 3+ word tokens stops generic camera names (IMG_1234) from merging.
export const seriesKey = (file) => {
  let s = file.replace(/^\d+_/, "").replace(/^File_/i, "").toLowerCase();
  s = s.replace(/(\.(jpe?g|png|webp|gif|tiff?|svg))+$/i, "");
  s = s.replace(/\d+/g, "#").replace(/[_\-.\s()'"]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const words = s.split("_").filter((t) => /[a-z]{2,}/.test(t));
  return words.length >= 3 ? s : null;
};

class UnionFind {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(i) { while (this.p[i] !== i) { this.p[i] = this.p[this.p[i]]; i = this.p[i]; } return i; }
  union(a, b) { const ra = this.find(a); const rb = this.find(b); if (ra !== rb) this.p[rb] = ra; }
}

/** Scan, apply the review keep-list and quality gate, and detect duplicates. */
export const buildDataset = (options = {}) => {
  const cfg = { ...DEFAULTS, ...options };
  const review = loadReview();
  const items = [];
  const excluded = [];
  const perClass = {};

  for (const cls of visualClasses) {
    const files = listImages(cls.id);
    const decision = review.classes[cls.id];
    const keep = new Set((decision?.keep || []).map((k) => k.sha1));
    const stats = { downloaded: files.length, reviewed: Boolean(decision), keptByReview: 0, failedQuality: 0, duplicateWithinClass: 0 };
    const seenSha = new Set();

    for (const file of files) {
      const full = path.join(DATASET, cls.id, file);
      const bytes = fs.readFileSync(full);
      const sha1 = crypto.createHash("sha1").update(bytes).digest("hex");
      if (!keep.has(sha1)) { excluded.push({ classId: cls.id, file, reason: decision ? "removed in label review" : "class not reviewed" }); continue; }
      stats.keptByReview += 1;
      if (seenSha.has(sha1)) { stats.duplicateWithinClass += 1; excluded.push({ classId: cls.id, file, reason: "exact duplicate within class" }); continue; }
      seenSha.add(sha1);

      let img;
      try { img = decodeImage(bytes); } catch (error) {
        excluded.push({ classId: cls.id, file, reason: `undecodable: ${error.message}` });
        continue;
      }
      const gate = appQualityGate(img);
      if (!gate.valid) {
        stats.failedQuality += 1;
        excluded.push({ classId: cls.id, file, reason: `fails app quality gate: ${gate.reasons.join(", ")}` });
        continue;
      }
      items.push({ classId: cls.id, label: cls.label, sha1, file: full, name: file, dhash: dHash(img), series: seriesKey(file), width: img.width, height: img.height });
    }
    perClass[cls.id] = stats;
  }

  // Byte-identical files under two labels are certain contradictions. Visual
  // near-duplicates are resolved later by resolvePerceptualConflicts, once
  // embeddings exist: a 64-bit dHash alone collides on low-detail images (a
  // plain cardboard band and a CRT TV hashed 4 bits apart here).
  const { items: clean, conflicts } = dropConflicts(items, excluded, (a, b) => a.sha1 === b.sha1);
  return { items: clean, excluded, conflicts, perClass, config: cfg };
};

const cosineOf = (a, b) => {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / Math.sqrt(na * nb);
};

const dropConflicts = (items, excluded, isSame) => {
  const conflictIdx = new Set();
  const conflicts = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (items[i].classId === items[j].classId) continue;
      if (isSame(items[i], items[j])) {
        conflictIdx.add(i); conflictIdx.add(j);
        conflicts.push([`${items[i].classId}/${items[i].name}`, `${items[j].classId}/${items[j].name}`]);
      }
    }
  }
  for (const i of conflictIdx) excluded.push({ classId: items[i].classId, file: items[i].name, reason: "same image appears in another class" });
  return { items: items.filter((_, i) => !conflictIdx.has(i)), conflicts };
};

/**
 * Cross-class visual duplicates: dHash proposes, the embedding confirms. The
 * same picture under two labels teaches a contradiction, so both copies go.
 */
export const resolvePerceptualConflicts = (items, excluded, embeddings, { conflictHamming }) => {
  const rejectedByEmbedding = [];
  const result = dropConflicts(items, excluded, (a, b) => {
    if (hamming(a.dhash, b.dhash) > conflictHamming) return false;
    const cos = cosineOf(embeddings.get(a.sha1), embeddings.get(b.sha1));
    if (cos >= 0.9) return true;
    rejectedByEmbedding.push({ a: `${a.classId}/${a.name}`, b: `${b.classId}/${b.name}`, cosine: Number(cos.toFixed(3)) });
    return false;
  });
  return { ...result, rejectedByEmbedding };
};

/**
 * Assign group ids. Near-duplicates, same-series uploads and (optionally)
 * near-identical embeddings are unioned. `embeddings` maps sha1 -> Float32Array.
 */
export const assignGroups = (items, { nearDupHamming, embedDupCosine }, embeddings) => {
  if (!embeddings) throw new Error("assignGroups needs clean-view embeddings to confirm perceptual duplicates");
  const uf = new UnionFind(items.length);
  const reasons = { series: 0, nearDuplicateConfirmed: 0, nearDuplicateRejected: 0, embedding: 0 };

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i]; const b = items[j];
      if (a.classId !== b.classId) continue;
      if (uf.find(i) === uf.find(j)) continue;
      // Same upload series is certain provenance, no confirmation needed.
      if (a.series && a.series === b.series) { uf.union(i, j); reasons.series += 1; continue; }
      const cos = cosineOf(embeddings.get(a.sha1), embeddings.get(b.sha1));
      if (hamming(a.dhash, b.dhash) <= nearDupHamming) {
        if (cos >= 0.9) { uf.union(i, j); reasons.nearDuplicateConfirmed += 1; continue; }
        reasons.nearDuplicateRejected += 1;
      }
      if (cos >= embedDupCosine) { uf.union(i, j); reasons.embedding += 1; }
    }
  }
  const ids = new Map();
  items.forEach((item, i) => {
    const root = uf.find(i);
    if (!ids.has(root)) ids.set(root, `${item.classId}:${ids.size}`);
    item.group = ids.get(root);
  });
  return reasons;
};

/**
 * Group-aware stratified split. Whole groups go to test until ~testFraction of
 * a class is reached; smaller groups are preferred so the test set spans many
 * independent sources. Remaining groups become train and are dealt into folds.
 */
export const splitGroups = (items, { seed, testFraction, folds, minKept, minGroups }) => {
  const rand = mulberry32(seed);
  const byClass = new Map();
  for (const item of items) {
    if (!byClass.has(item.classId)) byClass.set(item.classId, []);
    byClass.get(item.classId).push(item);
  }

  const eligible = [];
  const ineligible = [];
  for (const [classId, members] of byClass) {
    const groups = new Map();
    for (const m of members) {
      if (!groups.has(m.group)) groups.set(m.group, []);
      groups.get(m.group).push(m);
    }
    if (members.length < minKept || groups.size < minGroups) {
      ineligible.push({ classId, images: members.length, groups: groups.size });
      members.forEach((m) => { m.split = "excluded"; });
      continue;
    }
    eligible.push(classId);

    const list = [...groups.values()].map((g) => ({ g, r: rand() }))
      .sort((a, b) => a.g.length - b.g.length || a.r - b.r)
      .map((x) => x.g);
    const target = Math.max(1, Math.round(members.length * testFraction));
    let inTest = 0;
    const test = [];
    const train = [];
    for (const g of list) {
      const wouldLeaveTrain = train.length === 0 && test.length === list.length - 1;
      if (inTest < target && !wouldLeaveTrain && (inTest + g.length <= target * 1.5 || test.length === 0)) {
        test.push(g); inTest += g.length;
      } else {
        train.push(g);
      }
    }
    test.flat().forEach((m) => { m.split = "test"; });

    // Deal train groups into folds, largest first, each to the lightest fold.
    const load = Array(folds).fill(0);
    [...train].sort((a, b) => b.length - a.length).forEach((g) => {
      const f = load.indexOf(Math.min(...load));
      load[f] += g.length;
      g.forEach((m) => { m.split = "train"; m.fold = f; });
    });
  }
  return { eligible: eligible.sort(), ineligible };
};
