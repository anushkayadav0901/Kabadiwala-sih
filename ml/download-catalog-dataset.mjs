// Downloads attribution-tracked Creative Commons candidate images from
// Wikimedia Commons for the exact material catalogue. Review images before
// training: search results are candidates, not ground truth.
import fs from "node:fs/promises";
import path from "node:path";
import { materialCatalog } from "../frontend/src/data/materialCatalog.js";

const outputRoot = path.resolve("ml", "catalog-dataset");
const requested = Number(process.env.IMAGES_PER_CLASS || 80);
const only = process.env.CLASS_ONLY;
const classes = only ? materialCatalog.filter((item) => item.id === only) : materialCatalog;
if (!classes.length) throw new Error(`Unknown CLASS_ONLY: ${only}`);

const api = async (params) => {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", origin: "*", ...params });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);
  return response.json();
};
const safe = (value) => value.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 120);
const text = (metadata, key) => metadata?.[key]?.value?.replace(/<[^>]+>/g, "") || "";
const searchTerms = {
  hard_plastic: ["plastic crate", "plastic bucket"],
  soft_plastic_film: ["plastic film", "plastic packaging"],
  copper_wire_scrap: ["copper wire", "electrical cable"],
  iron_scrap: ["iron scrap", "scrap metal"],
  stainless_steel: ["stainless steel scrap", "stainless steel objects"],
  aluminium_scrap: ["aluminium scrap", "aluminium objects"],
  brass_scrap: ["brass scrap", "brass objects"],
  mixed_e_waste: ["electronic waste", "e-waste"],
  smartphone_scrap: ["smartphone", "mobile phone"],
  basic_mobile_phone: ["feature phone", "mobile phone"],
  laptop_screen: ["laptop screen", "laptop computer"],
  lcd_led_monitor: ["LCD monitor", "LED monitor"],
  crt_monitor: ["CRT monitor", "computer monitor"],
  crt_television: ["CRT television", "television set"]
};

const candidatesFor = async (item) => {
  const terms = searchTerms[item.id] || [item.label.replace(/\([^)]*\)/g, "").trim()];
  const results = await Promise.all(terms.map((term) => api({ generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: "100", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "900" })));
  return Array.from(results.flatMap((result) => Object.values(result.query?.pages || {})).reduce((unique, page) => unique.set(page.title, page), new Map()).values()).map((page) => ({ title: page.title, ...(page.imageinfo?.[0] || {}) }))
    .filter((image) => ["image/jpeg", "image/png", "image/webp"].includes(image.mime))
    .filter((image) => image.width >= 224 && image.height >= 160 && image.thumburl);
};

await fs.mkdir(outputRoot, { recursive: true });
const manifest = [];
for (const item of classes) {
  const classRoot = path.join(outputRoot, item.id);
  await fs.mkdir(classRoot, { recursive: true });
  const candidates = await candidatesFor(item);
  let saved = 0;
  for (const image of candidates) {
    if (saved >= requested) break;
    const response = await fetch(image.thumburl);
    if (!response.ok) continue;
    const file = `${String(saved + 1).padStart(3, "0")}_${safe(image.title)}.jpg`;
    await fs.writeFile(path.join(classRoot, file), Buffer.from(await response.arrayBuffer()));
    manifest.push({ class: item.id, file: path.join(item.id, file).replaceAll("\\", "/"), source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(image.title.replaceAll(" ", "_"))}`, license: text(image.extmetadata, "LicenseShortName"), author: text(image.extmetadata, "Artist"), title: image.title });
    saved += 1;
  }
  console.log(`${item.id}: downloaded ${saved}/${requested} candidates`);
}
await fs.writeFile(path.join(outputRoot, "ATTRIBUTION.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), requested, manifest }, null, 2)}\n`);
