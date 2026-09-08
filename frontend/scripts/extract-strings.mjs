// ---------------------------------------------------------------------------
// STRING EXTRACTION
//
// Walks the JSX source and collects every user-facing English string into
// locales/_source.json. That file is the input to translate-strings.mjs.
//
//   node scripts/extract-strings.mjs
//
// Re-run it whenever new screens are added; it merges rather than overwrites,
// so strings already translated keep their translations.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");
const OUT = path.join(__dirname, "..", "src", "locales", "_source.json");

// Strings that must never be translated: brand names, units, code-ish tokens.
const SKIP_EXACT = new Set([
  "Kabadiwala Connect", "WhatsApp", "UPI", "GPS", "QR", "PDF", "AI", "CPCB",
  "SPCB", "EPR", "MT", "kg", "km", "₹", "CRT", "LCD", "PCB", "SIH", "OTP",
  // Language names stay in their own language in the picker.
  "English", "Hindi", "Marathi",
]);

// Tailwind class strings reach the extractor through class-ish props and are
// not user copy. They are reliably distinguishable from real English: every
// token is a lowercase utility slug, at least one carries a hyphen or variant
// colon, and none of them are ordinary English function words.
const UTILITY_TOKEN = /^[a-z0-9]+(?:[-:/[\]().][a-z0-9%.[\]/-]*)*$/;
const STOPWORDS = /\b(?:the|a|an|your|you|is|are|to|and|or|for|of|in|on|with|it|this|that|per|not|no|do|be)\b/i;

const looksLikeClassNames = (t) => {
  if (STOPWORDS.test(t)) return false;
  if (/[A-Z.!?,₹]/.test(t)) return false;
  const words = t.split(/\s+/);
  return words.every((w) => UTILITY_TOKEN.test(w)) && words.some((w) => /[-:]/.test(w));
};

const looksTranslatable = (s) => {
  const t = s.trim();
  if (t.length < 3 || t.length > 240) return false;
  if (SKIP_EXACT.has(t)) return false;
  if (!/[a-z]/.test(t)) return false;              // needs lowercase letters
  if (!/^[A-Za-z]/.test(t)) return false;          // must start with a letter
  if (/^[A-Z_]+$/.test(t)) return false;           // CONSTANT_CASE
  if (/[{}<>$`]/.test(t)) return false;            // template/JSX fragments
  if (/[;=]|\(\s*$|\)\s*[;,]?\s*$|\[\]|=>/.test(t)) return false; // leaked code
  if (/\w\(|\w\[/.test(t)) return false;           // function calls / indexing
  if (looksLikeClassNames(t)) return false;
  if (/^(https?:|\/|\.\/|#)/.test(t)) return false;
  if (/\.(jsx?|json|png|jpg|svg|css)$/i.test(t)) return false;
  if (/^[a-z]+([A-Z][a-z]*)+$/.test(t)) return false; // camelCase identifiers
  if (/^[a-z0-9_]+$/.test(t) && !t.includes(" ")) return false; // snake/lone token
  return /\s/.test(t) || /^[A-Z]/.test(t);         // a phrase, or a capitalised word
};

const files = [];
const jsFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (entry !== "locales" && entry !== "node_modules") walk(full);
    } else if (/\.jsx$/.test(entry)) {
      files.push(full);
    } else if (/\.js$/.test(entry)) {
      // Plain .js holds UI copy too: constants, option lists, training content.
      jsFiles.push(full);
    }
  }
})(SRC);

// Properties whose values are shown to the user.
const UI_PROP =
  /(?:\bname|label|heading|message|desc|description|subtitle|title|text|tooltip|caption|body|tip|placeholder|q|why|shortDescription|safetyWarning):\s*"([^"]{3,})"/g;

const found = new Map(); // string -> Set of files

const add = (raw, file) => {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!looksTranslatable(value)) return;
  if (!found.has(value)) found.set(value, new Set());
  found.get(value).add(path.relative(SRC, file).replace(/\\/g, "/"));
};

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");

  // 1. Text sitting directly between JSX tags.
  for (const m of src.matchAll(/>([^<>{}\n][^<>{}]*)</g)) add(m[1], file);

  // 2. Multi-line JSX text blocks.
  for (const m of src.matchAll(/>\s*\n\s*([A-Z][^<>{}]{4,})\n\s*</g)) add(m[1], file);

  // 3. Human-facing attributes.
  for (const m of src.matchAll(/(?:placeholder|title|alt|aria-label)="([^"]{3,})"/g)) add(m[1], file);

  // 4. String literals in obvious UI-copy positions.
  for (const m of src.matchAll(UI_PROP)) add(m[1], file);

  // 5. Strings inside JSX expressions, e.g. {busy ? "Saving…" : "Save"}.
  for (const m of src.matchAll(/\{[^{}]*\?[^{}]*\}/g)) {
    for (const lit of m[0].matchAll(/"([^"]{3,})"/g)) add(lit[1], file);
  }
}

// Plain .js sources: only pull from clearly-labelled UI-copy properties,
// never from every string literal, or config keys would flood the output.
for (const file of jsFiles) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(UI_PROP)) add(m[1], file);
}

const sorted = [...found.entries()].sort(([a], [b]) => a.localeCompare(b));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: sorted.length,
      strings: sorted.map(([text, usedIn]) => ({ text, usedIn: [...usedIn] })),
    },
    null,
    2
  ) + "\n"
);

console.log(`Scanned ${files.length} JSX files`);
console.log(`Extracted ${sorted.length} unique user-facing strings`);
console.log(`Written to ${path.relative(process.cwd(), OUT)}`);
