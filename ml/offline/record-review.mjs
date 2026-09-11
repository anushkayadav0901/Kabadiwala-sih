// ---------------------------------------------------------------------------
// RECORD LABEL-REVIEW DECISIONS
//
//   node ml/offline/record-review.mjs <classId> "<keep indices>" "<note>"
//   node ml/offline/record-review.mjs <classId> all-except "<indices>" "<note>"
//
// Indices are the tile numbers on ml/experiments/review/<classId>.png. Each
// decision is frozen as the SHA-1 of the image bytes, not the filename:
// the downloader truncates titles to 120 characters (so distinct pages can
// share a filename) and re-downloads can reorder the numeric prefix.
//
// label-review.json is a KEEP list. An image trains only if a reviewer has
// confirmed it shows the class — anything unreviewed is excluded by default.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { listImages } from "./contact-sheet.mjs";

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW = path.join(ML, "offline", "label-review.json");

export const CRITERION =
  "Keep an image only if it shows the labelled item or material as a scrap collector would actually " +
  "encounter it, as a main subject of the photo. Correct-but-difficult images (odd angle, clutter, poor light) " +
  "are KEPT. Removed: a different object; documents, ledgers, adverts, posters, charts and drawings; museum or " +
  "archaeological artefacts (these also carry measurement scale bars the model can learn as a shortcut); " +
  "landscapes and people-focused photos where the item is incidental; and images duplicated into another class.";

export const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

export const loadReview = () =>
  fs.existsSync(REVIEW)
    ? JSON.parse(fs.readFileSync(REVIEW, "utf8"))
    : { criterion: CRITERION, classes: {} };

const parseIndices = (text) =>
  text.split(/[,\s]+/).filter(Boolean).flatMap((part) => {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    }
    if (!/^\d+$/.test(part)) throw new Error(`bad index "${part}"`);
    return [Number(part)];
  });

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [classId, ...rest] = process.argv.slice(2);
  const files = listImages(classId);
  if (!files.length) throw new Error(`no images for ${classId}`);

  let keepIdx;
  let note;
  if (rest[0] === "all-except") {
    const drop = new Set(parseIndices(rest[1] || ""));
    keepIdx = files.map((_, i) => i).filter((i) => !drop.has(i));
    note = rest[2] || "";
  } else {
    keepIdx = parseIndices(rest[0] || "");
    note = rest[1] || "";
  }
  const bad = keepIdx.filter((i) => i < 0 || i >= files.length);
  if (bad.length) throw new Error(`indices out of range for ${classId} (0-${files.length - 1}): ${bad}`);

  const dir = path.join(ML, "visual-dataset", classId);
  const keep = [...new Set(keepIdx)].sort((a, b) => a - b).map((i) => ({
    sha1: sha1(fs.readFileSync(path.join(dir, files[i]))),
    file: files[i],
  }));

  const review = loadReview();
  review.criterion = CRITERION;
  review.classes[classId] = {
    reviewed: files.length,
    kept: keep.length,
    removed: files.length - keep.length,
    note,
    keep,
  };
  review.updatedAt = new Date().toISOString();
  fs.writeFileSync(REVIEW, `${JSON.stringify(review, null, 2)}\n`);
  console.log(`${classId}: kept ${keep.length}/${files.length} (${Math.round((100 * keep.length) / files.length)}%)`);
}
