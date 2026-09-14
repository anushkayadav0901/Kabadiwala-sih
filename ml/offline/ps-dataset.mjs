import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { psClasses, psLabelPolicy } from "../ps-classes.mjs";
import { PS_ROOT, loadPsManifest, loadPsReview } from "./ps-data.mjs";
import { appQualityGate, assignGroups, resolvePerceptualConflicts, seriesKey, DEFAULTS } from "./dataset.mjs";
import { decodeImage, dHash, mulberry32 } from "./image-io.mjs";

export const PS_SPLIT_CONFIG = { ...DEFAULTS, seed: 20260912, minKept: psLabelPolicy.minimumImages, minGroups: psLabelPolicy.minimumGroups };
export const scanPsDataset = () => {
  const review = loadPsReview();
  const items = [];
  const excluded = [];
  const hashes = new Set();
  for (const image of loadPsManifest().images) {
    const cls = psClasses.find((entry) => entry.id === image.classId);
    if (!cls) throw new Error(`Unknown class ${image.classId}`);
    const decision = review.decisions[`${image.classId}:${image.sha1}`];
    if (!decision?.keep) { excluded.push({ file: image.file, reason: decision ? "review rejected" : "unreviewed" }); continue; }
    const file = path.join(PS_ROOT, image.file);
    const bytes = fs.readFileSync(file);
    if (crypto.createHash("sha1").update(bytes).digest("hex") !== image.sha1) throw new Error(`Reviewed image changed: ${image.file}`);
    const key = `${image.classId}:${image.sha1}`;
    if (hashes.has(key)) continue;
    hashes.add(key);
    const decoded = decodeImage(bytes);
    const quality = appQualityGate(decoded);
    const author = image.author?.replace(/\s+/g, " ").trim().toLowerCase();
    items.push({ ...image, file, label: cls.label, name: image.title, dhash: dHash(decoded), series: seriesKey(image.title.replace(/^File:/, "")), authorGroup: author && !/^(unknown|own work|anonymous|public domain|n\/a)$/.test(author) ? author : null, quality });
  }
  return { items, excluded };
};

export const groupPsDataset = (items, excluded, embeddings) => {
  const { items: clean, conflicts } = resolvePerceptualConflicts(items, excluded, embeddings, PS_SPLIT_CONFIG);
  const groupReasons = assignGroups(clean, PS_SPLIT_CONFIG, embeddings);
  const parent = new Map(clean.map((item) => [item.group, item.group]));
  const root = (group) => {
    while (parent.get(group) !== group) { parent.set(group, parent.get(parent.get(group))); group = parent.get(group); }
    return group;
  };
  const authors = new Map();
  for (const item of clean) {
    if (!item.authorGroup) continue;
    const key = `${item.classId}:${item.authorGroup}`;
    if (authors.has(key)) parent.set(root(item.group), root(authors.get(key)));
    else authors.set(key, item.group);
  }
  for (const item of clean) item.group = root(item.group);
  return { items: clean, conflicts, groupReasons };
};

export const splitPsDataset = (items) => {
  const random = mulberry32(PS_SPLIT_CONFIG.seed);
  const classTable = [];
  for (const cls of psClasses) {
    const members = items.filter((item) => item.classId === cls.id);
    const byGroup = new Map();
    for (const item of members) {
      if (!byGroup.has(item.group)) byGroup.set(item.group, []);
      byGroup.get(item.group).push(item);
    }
    const groups = [...byGroup.values()];
    const usableGroups = groups.filter((group) => group.some((item) => item.quality.valid));
    const usableImages = members.filter((item) => item.quality.valid).length;
    if (usableImages < PS_SPLIT_CONFIG.minKept || usableGroups.length < PS_SPLIT_CONFIG.minGroups) {
      members.forEach((item) => { item.split = "excluded"; });
      classTable.push({ id: cls.id, label: cls.label, reviewedImages: members.length, usableImages, groups: groups.length, status: "manual-only: insufficient independent reviewed data" });
      continue;
    }
    const shuffled = groups.map((group) => ({ group, random: random() })).sort((left, right) => left.random - right.random).map((entry) => entry.group);
    const targetGroups = Math.max(1, Math.round(usableGroups.length * PS_SPLIT_CONFIG.testFraction));
    let testGroups = 0;
    const train = [];
    for (const group of shuffled) {
      if (testGroups < targetGroups && group.some((item) => item.quality.valid)) {
        group.forEach((item) => { item.split = "test"; });
        testGroups += 1;
      } else if (group.some((item) => item.quality.valid)) {
        train.push(group);
      } else {
        group.forEach((item) => { item.split = "quality-rejected"; });
      }
    }
    const load = Array(PS_SPLIT_CONFIG.folds).fill(0);
    train.sort((left, right) => right.length - left.length).forEach((group) => {
      const fold = load.indexOf(Math.min(...load));
      load[fold] += group.filter((item) => item.quality.valid).length;
      group.forEach((item) => { item.split = item.quality.valid ? "train" : "quality-rejected"; item.fold = fold; });
    });
    if (load.some((count) => count === 0)) throw new Error(`Insufficient independent groups for every fold: ${cls.id}`);
    classTable.push({ id: cls.id, label: cls.label, reviewedImages: members.length, usableImages, groups: groups.length, train: members.filter((item) => item.split === "train").length, test: members.filter((item) => item.split === "test").length, testUsable: members.filter((item) => item.split === "test" && item.quality.valid).length, foldCounts: load, status: "trained" });
  }
  const trainGroups = new Set(items.filter((item) => item.split === "train").map((item) => item.group));
  const testGroups = new Set(items.filter((item) => item.split === "test").map((item) => item.group));
  if ([...trainGroups].some((group) => testGroups.has(group))) throw new Error("Train/test group leakage");
  const foldByGroup = new Map();
  for (const item of items.filter((entry) => entry.split === "train")) {
    if (foldByGroup.has(item.group) && foldByGroup.get(item.group) !== item.fold) throw new Error("Cross-validation group leakage");
    foldByGroup.set(item.group, item.fold);
  }
  return classTable;
};
