// Downloads attribution-tracked *candidates* for the deliberately broad
// visual classes. Results must pass the automated checks and human spot review
// before deployment.
import fs from "node:fs/promises";
import path from "node:path";
import { visualClasses } from "./visual-classes.mjs";

const outputRoot = path.resolve("ml", "visual-dataset");
const requested = Number(process.env.IMAGES_PER_CLASS || 40);
const only = process.env.CLASS_ONLY;
const requestedIds = only?.split(",").map((value) => value.trim()).filter(Boolean);
const classes = requestedIds ? visualClasses.filter((item) => requestedIds.includes(item.id)) : visualClasses;
if (!classes.length || (requestedIds && classes.length !== requestedIds.length)) throw new Error(`Unknown CLASS_ONLY: ${only}`);

const api = async (params) => {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", origin: "*", ...params });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);
  return response.json();
};
const safe = (value) => value.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 120);
const text = (metadata, key) => metadata?.[key]?.value?.replace(/<[^>]+>/g, "") || "";
const candidatesFor = async (item) => {
  const results = await Promise.all(item.terms.map((term) => api({ generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: "80", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "768" })));
  return Array.from(results.flatMap((result) => Object.values(result.query?.pages || {})).reduce((unique, page) => unique.set(page.title, page), new Map()).values())
    .map((page) => ({ title: page.title, ...(page.imageinfo?.[0] || {}) }))
    .filter((image) => ["image/jpeg", "image/png", "image/webp"].includes(image.mime) && image.width >= 224 && image.height >= 160 && image.thumburl);
};

await fs.mkdir(outputRoot, { recursive: true });
const manifest = [];
for (const item of classes) {
  const classRoot = path.join(outputRoot, item.id);
  await fs.rm(classRoot, { recursive: true, force: true });
  await fs.mkdir(classRoot, { recursive: true });
  let saved = 0;
  for (const image of await candidatesFor(item)) {
    if (saved >= requested) break;
    try {
      const response = await fetch(image.thumburl);
      if (!response.ok) continue;
      const file = `${String(saved + 1).padStart(3, "0")}_${safe(image.title)}.jpg`;
      await fs.writeFile(path.join(classRoot, file), Buffer.from(await response.arrayBuffer()));
      manifest.push({ class: item.id, file: path.join(item.id, file).replaceAll("\\", "/"), source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(image.title.replaceAll(" ", "_"))}`, license: text(image.extmetadata, "LicenseShortName"), author: text(image.extmetadata, "Artist"), title: image.title });
      saved += 1;
    } catch { /* Skip an unreadable candidate. */ }
  }
  console.log(`${item.id}: downloaded ${saved}/${requested} candidates`);
}
await fs.writeFile(path.join(outputRoot, "ATTRIBUTION.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), requested, manifest }, null, 2)}\n`);
