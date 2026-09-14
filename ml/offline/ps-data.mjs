import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { psClasses, psLabelPolicy } from "../ps-classes.mjs";
import { decodeImage, tmCrop } from "./image-io.mjs";

const ML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PS_ROOT = path.join(ML, "experiments", "ps-data");
export const PS_REVIEW = path.join(ML, "offline", "ps-label-review.json");
const MANIFEST = path.join(PS_ROOT, "manifest.json");
const digest = (bytes) => crypto.createHash("sha1").update(bytes).digest("hex");
const save = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(`${file}.tmp`, file);
};
export const loadPsManifest = () => fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { version: 1, images: [], searches: [], errors: [] };
export const loadPsReview = () => fs.existsSync(PS_REVIEW) ? JSON.parse(fs.readFileSync(PS_REVIEW, "utf8")) : { policy: psLabelPolicy, decisions: {} };

const request = async (url, binary = false) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { "User-Agent": "KabadiwalaResearch/1.0 (educational e-waste image classification)" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return binary ? Buffer.from(await response.arrayBuffer()) : await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
};
const stripped = (text = "") => text.replace(/<[^>]+>/g, "");
const download = async (ids, limit) => {
  const manifest = loadPsManifest();
  for (const cls of psClasses.filter((entry) => !ids.length || ids.includes(entry.id))) {
    const target = cls.candidateLimit || limit;
    const existing = manifest.images.filter((image) => image.classId === cls.id);
    if (existing.length >= target) continue;
    const titles = new Set(existing.map((image) => image.title));
    const hashes = new Set(existing.map((image) => image.sha1));
    const lists = [];
    for (const query of cls.terms) {
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      url.search = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "40", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "768" });
      try {
        const result = await request(url);
        if (result.error) throw new Error(JSON.stringify(result.error));
        const pages = Object.values(result.query?.pages || {}).sort((left, right) => left.index - right.index);
        lists.push(pages.map((page) => ({ title: page.title, pageId: page.pageid, query, ...page.imageinfo?.[0] })).filter((image) => ["image/jpeg", "image/png"].includes(image.mime) && image.width >= 224 && image.height >= 160 && image.thumburl));
        manifest.searches.push({ classId: cls.id, query, count: lists.at(-1).length, at: new Date().toISOString() });
      } catch (error) {
        manifest.errors.push({ classId: cls.id, query, error: error.message });
        console.error(`${cls.id}: query failed: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const candidates = [];
    for (let index = 0; index < 40; index += 1) for (const list of lists) if (list[index]) candidates.push(list[index]);
    let saved = existing.length;
    for (const image of candidates) {
      if (saved >= limit) break;
      if (titles.has(image.title)) continue;
      titles.add(image.title);
      try {
        const bytes = await request(image.thumburl, true);
        const decoded = decodeImage(bytes);
        if (decoded.width < 224 || decoded.height < 160) continue;
        const sha1 = digest(bytes);
        if (hashes.has(sha1)) continue;
        hashes.add(sha1);
        const extension = bytes[0] === 137 ? ".png" : ".jpg";
        const filename = `${sha1}${extension}`;
        const relative = `${cls.id}/${filename}`;
        fs.mkdirSync(path.join(PS_ROOT, cls.id), { recursive: true });
        fs.writeFileSync(path.join(PS_ROOT, relative), bytes);
        manifest.images.push({ classId: cls.id, file: relative, sha1, title: image.title, pageId: image.pageId, query: image.query, source: image.descriptionurl, originalUrl: image.url, downloadUrl: image.thumburl, width: decoded.width, height: decoded.height, author: stripped(image.extmetadata?.Artist?.value), license: stripped(image.extmetadata?.LicenseShortName?.value), downloadedAt: new Date().toISOString() });
        saved += 1;
        save(MANIFEST, manifest);
        if (saved % 20 === 0) console.log(`${cls.id}: ${saved} candidates saved`);
      } catch (error) {
        manifest.errors.push({ classId: cls.id, title: image.title, error: error.message });
      }
    }
    save(MANIFEST, manifest);
    console.log(`${cls.id}: ${saved}/${limit} total candidates (not training labels)`);
  }
};

const GLYPHS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
const sheets = (ids) => {
  const manifest = loadPsManifest();
  for (const cls of psClasses.filter((entry) => !ids.length || ids.includes(entry.id))) {
    const images = manifest.images.filter((image) => image.classId === cls.id);
    for (let start = 0; start < images.length; start += 48) {
      const page = images.slice(start, start + 48);
      const png = new PNG({ width: 1060, height: Math.ceil(page.length / 8) * 152 + 4 });
      png.data.fill(35);
      for (let offset = 3; offset < png.data.length; offset += 4) png.data[offset] = 255;
      const pixel = (horizontal, vertical, red, green, blue) => {
        const offset = (vertical * png.width + horizontal) * 4;
        png.data[offset] = red; png.data[offset + 1] = green; png.data[offset + 2] = blue;
      };
      page.forEach((image, index) => {
        const left = 4 + index % 8 * 132;
        const top = 4 + Math.floor(index / 8) * 152;
        const crop = tmCrop(decodeImage(fs.readFileSync(path.join(PS_ROOT, image.file))), 224);
        for (let vertical = 0; vertical < 128; vertical += 1) for (let horizontal = 0; horizontal < 128; horizontal += 1) {
          const offset = (Math.floor(vertical * 224 / 128) * 224 + Math.floor(horizontal * 224 / 128)) * 3;
          pixel(left + horizontal, top + 20 + vertical, crop[offset], crop[offset + 1], crop[offset + 2]);
        }
        [...String(start + index)].forEach((digit, position) => {
          const bits = GLYPHS[Number(digit)];
          for (let vertical = 0; vertical < 5; vertical += 1) for (let horizontal = 0; horizontal < 3; horizontal += 1) if (bits[vertical * 3 + horizontal] === "1") {
            for (let dy = 0; dy < 2; dy += 1) for (let dx = 0; dx < 2; dx += 1) pixel(left + 3 + position * 8 + horizontal * 2 + dx, top + 3 + vertical * 2 + dy, 255, 255, 255);
          }
        });
      });
      const stem = path.join(PS_ROOT, "review", `${cls.id}-${start}`);
      fs.mkdirSync(path.dirname(stem), { recursive: true });
      fs.writeFileSync(`${stem}.png`, PNG.sync.write(png));
      save(`${stem}.json`, page);
    }
    console.log(`${cls.id}: ${images.length} candidates in ${Math.ceil(images.length / 48)} review pages`);
  }
};
const parseIndices = (text) => text.split(/[,\s]+/).filter(Boolean).flatMap((part) => {
  if (/^\d+$/.test(part)) return [Number(part)];
  const match = part.match(/^(\d+)-(\d+)$/);
  if (!match || Number(match[2]) < Number(match[1])) throw new Error(`Invalid range ${part}`);
  return Array.from({ length: Number(match[2]) - Number(match[1]) + 1 }, (_, index) => Number(match[1]) + index);
});
const reviewPage = (classId, start, keepIndices, note) => {
  const page = JSON.parse(fs.readFileSync(path.join(PS_ROOT, "review", `${classId}-${start}.json`), "utf8"));
  const keep = new Set(parseIndices(keepIndices));
  for (const index of keep) if (index < start || index >= start + page.length) throw new Error(`Out-of-page index ${index}`);
  const review = loadPsReview();
  page.forEach((image, index) => {
    if (digest(fs.readFileSync(path.join(PS_ROOT, image.file))) !== image.sha1) throw new Error(`Image changed since review sheet: ${image.file}`);
    review.decisions[`${classId}:${image.sha1}`] = { classId, sha1: image.sha1, title: image.title, keep: keep.has(start + index), note, reviewedAt: new Date().toISOString() };
  });
  save(PS_REVIEW, review);
  console.log(`${classId} page ${start}: kept ${keep.size}/${page.length}; all decisions recorded by SHA-1`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "download") await download(args, Number(process.env.PS_CANDIDATES || 96));
  else if (command === "sheets") sheets(args);
  else if (command === "review") reviewPage(args[0], Number(args[1]), args[2] || "", args[3] || "Visual semantic review; no model predictions consulted.");
  else if (command === "summary") {
    const manifest = loadPsManifest();
    const review = loadPsReview();
    console.table(psClasses.map((cls) => {
      const images = manifest.images.filter((image) => image.classId === cls.id);
      const decisions = images.map((image) => review.decisions[`${cls.id}:${image.sha1}`]);
      return { class: cls.id, candidates: images.length, reviewed: decisions.filter(Boolean).length, kept: decisions.filter((decision) => decision?.keep).length };
    }));
  } else throw new Error("Usage: ps-data.mjs download|sheets|summary [classIds...] OR review <classId> <pageStart> <keepIndices> [note]");
}
