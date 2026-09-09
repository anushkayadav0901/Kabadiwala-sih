import fs from "node:fs/promises";
import path from "node:path";

const outputRoot = path.resolve("ml", "commons-dataset");
const allClasses = [
  { label: "CRT", category: "CRT_monitors" },
  { label: "LCD", category: "LCD_monitors" },
  { label: "Cables", category: "Electric_cables" },
  { label: "Motors", category: "Electric_motors" },
  { label: "Mixed Plastics", category: "Plastic_waste" }
];
const selectedClass = process.env.CLASS_ONLY;
const classes = selectedClass
  ? allClasses.filter(({ label }) => label === selectedClass)
  : allClasses;
const imagesPerClass = Number(process.env.IMAGES_PER_CLASS || 25);

if (!classes.length) throw new Error(`Unknown CLASS_ONLY value: ${selectedClass}`);

const requestCommons = async (params) => {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    ...params
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Commons API returned ${response.status}`);
  return response.json();
};

const safeName = (name) => name
  .replace(/^File:/, "")
  .replace(/[^a-z0-9._-]+/gi, "_")
  .slice(0, 120);

const getFiles = async (category) => {
  const data = await requestCommons({
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmtype: "file",
    cmlimit: "500"
  });
  return data.query.categorymembers.map(({ title }) => title);
};

const getImageInfo = async (titles) => {
  const images = [];
  for (let index = 0; index < titles.length; index += 40) {
    const data = await requestCommons({
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: "900",
      titles: titles.slice(index, index + 40).join("|")
    });
    if (!data.query?.pages) continue;
    images.push(...Object.values(data.query.pages));
  }
  return images
    .map((page) => ({ title: page.title, ...(page.imageinfo?.[0] || {}) }))
    .filter((image) => ["image/jpeg", "image/png", "image/webp"].includes(image.mime))
    .filter((image) => image.width >= 224 && image.height >= 160 && image.thumburl);
};

const textValue = (metadata, key) => metadata?.[key]?.value?.replace(/<[^>]+>/g, "") || "";

await fs.mkdir(outputRoot, { recursive: true });
const manifest = [];

for (const { label, category } of classes) {
  const classRoot = path.join(outputRoot, label);
  await fs.mkdir(classRoot, { recursive: true });
  const titles = await getFiles(category);
  const candidates = await getImageInfo(titles);
  let saved = 0;

  for (const image of candidates) {
    if (saved >= imagesPerClass) break;
    const response = await fetch(image.thumburl);
    if (!response.ok) continue;
    const filename = `${String(saved + 1).padStart(3, "0")}_${safeName(image.title)}.jpg`;
    await fs.writeFile(path.join(classRoot, filename), Buffer.from(await response.arrayBuffer()));
    manifest.push({
      class: label,
      file: path.join(label, filename).replaceAll("\\", "/"),
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(image.title.replaceAll(" ", "_"))}`,
      license: textValue(image.extmetadata, "LicenseShortName"),
      author: textValue(image.extmetadata, "Artist"),
      title: image.title
    });
    saved += 1;
  }
  console.log(`${label}: downloaded ${saved}/${imagesPerClass}`);
}

await fs.writeFile(
  path.join(outputRoot, "ATTRIBUTION.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), imagesPerClass, manifest }, null, 2)}\n`
);
console.log(`Dataset written to ${outputRoot}`);