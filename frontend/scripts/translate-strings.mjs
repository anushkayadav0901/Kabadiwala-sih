// ---------------------------------------------------------------------------
// TRANSLATION GENERATION  (build-time, not runtime)
//
// Reads locales/_source.json and produces locales/hi.json and locales/mr.json,
// keyed by the exact English source text.
//
//   node scripts/translate-strings.mjs            # all missing strings
//   node scripts/translate-strings.mjs --lang hi  # one language
//   node scripts/translate-strings.mjs --force    # retranslate everything
//
// Source priority:
//   1. Bhashini  — the Government of India's national language stack (MeitY).
//      Used when BHASHINI_USER_ID and BHASHINI_API_KEY are set.
//   2. Groq      — fallback, and always used to review Bhashini output for
//                  scrap-trade vocabulary the generic models get wrong.
//frontend files
// Output is committed to the repo, so the running app never calls a
// translation API — PS 26229 requires the app to work offline.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES = path.join(__dirname, "..", "src", "locales");

// Load backend/.env so the Groq key lives in exactly one place.
const ENV_PATH = path.join(__dirname, "..", "..", "backend", ".env");
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const only = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;
const force = args.includes("--force");

const LANGS = {
  hi: { name: "Hindi", script: "Devanagari", bhashini: "hi" },
  mr: { name: "Marathi", script: "Devanagari", bhashini: "mr" },
};

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";
const BHASHINI_USER = process.env.BHASHINI_USER_ID;
const BHASHINI_KEY = process.env.BHASHINI_API_KEY;

const systemPrompt = (lang) => `You translate a mobile app used by India's informal scrap and e-waste collectors (kabadiwalas).

Translate each English string into ${lang.name} (${lang.script} script).

RULES:
1. Write for someone with limited literacy. Use short, everyday spoken words — the way a shopkeeper talks, not government or literary language.
2. Keep widely-understood English loanwords that collectors already use in daily speech: mobile, battery, plastic, scrap, app, online, offline, GPS, QR, WhatsApp, UPI, photo, camera. Do NOT force obscure pure-${lang.name} equivalents for these.
3. Never translate: brand names (Kabadiwala Connect), acronyms (CPCB, SPCB, EPR, PCB, LCD, CRT, MT, AI, OTP), currency symbols (₹), numbers, or units (kg, km).
4. Preserve any leading/trailing punctuation and the sentence's tone (a button label stays short; a warning stays urgent).
5. Domain vocabulary must be correct: "scrap" = the material collected, "lot" = a batch of collected material, "handover" = giving material to the recycler, "recycler" = the authorized buyer, "rate" = price per kg.
6. Return ONLY a JSON object mapping each exact English string to its translation. No commentary, no markdown fences.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The free tier caps tokens-per-minute, so a 429 is expected rather than
// exceptional. Honour the retry delay the API reports and try again.
const groqChat = async (messages, temperature) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: GROQ_MODEL, temperature, response_format: { type: "json_object" }, messages }),
    });

    if (res.status === 429) {
      const text = await res.text();
      const reported = Number(text.match(/try again in ([\d.]+)s/i)?.[1]);
      const wait = Math.ceil((Number.isFinite(reported) ? reported : 8 * (attempt + 1)) * 1000) + 750;
      process.stdout.write(`    rate limited, waiting ${Math.round(wait / 1000)}s… `);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return JSON.parse((await res.json()).choices[0].message.content);
  }
  throw new Error("rate limited after 6 attempts");
};

const callGroq = (strings, lang) =>
  groqChat(
    [
      { role: "system", content: systemPrompt(lang) },
      { role: "user", content: JSON.stringify(strings) },
    ],
    0.2
  );

// Bhashini's pipeline API. Only exercised when credentials are configured;
// its output still goes through the Groq review pass below.
const callBhashini = async (strings, lang) => {
  const config = await fetch("https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json", userID: BHASHINI_USER, ulcaApiKey: BHASHINI_KEY },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage: "en", targetLanguage: lang.bhashini } } }],
      pipelineRequestConfig: { pipelineId: "64392f96daac500b55c543cd" },
    }),
  });
  if (!config.ok) throw new Error(`Bhashini config ${config.status}`);
  const cfg = await config.json();
  const endpoint = cfg.pipelineInferenceAPIEndPoint;
  const serviceId = cfg.pipelineResponseConfig[0].config[0].serviceId;

  const infer = await fetch(endpoint.callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", [endpoint.inferenceApiKey.name]: endpoint.inferenceApiKey.value },
    body: JSON.stringify({
      pipelineTasks: [{
        taskType: "translation",
        config: { language: { sourceLanguage: "en", targetLanguage: lang.bhashini }, serviceId },
      }],
      inputData: { input: strings.map((source) => ({ source })) },
    }),
  });
  if (!infer.ok) throw new Error(`Bhashini infer ${infer.status}`);
  const out = await infer.json();
  const targets = out.pipelineResponse[0].output;
  return Object.fromEntries(strings.map((s, i) => [s, targets[i]?.target || s]));
};

const reviewWithGroq = (pairs, lang) =>
  groqChat(
    [
      {
        role: "system",
        content: `${systemPrompt(lang)}

You are REVIEWING machine translations for a scrap-collector app. The user sends {english: machine_translation}. Fix anything that is too formal, too literary, mistranslates scrap-trade vocabulary, or wrongly translates an acronym/brand. Keep good translations unchanged. Return the corrected {english: translation} object.`,
      },
      { role: "user", content: JSON.stringify(pairs) },
    ],
    0.1
  );

// A single string the model cannot encode as JSON fails its whole batch, so
// retry stubborn leftovers with TRANSLATE_BATCH=5 (or 1).
const BATCH = Number(process.env.TRANSLATE_BATCH) || 25;
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Material names already carry hand-authored hindiName / marathiName in the
// price data. Those are better than anything a model would produce, so seed
// them into the dictionary rather than translating the English again.
const seedFromMaterialData = (code) => {
  const file = path.join(__dirname, "..", "src", "data", "liveScrapRates.json");
  if (!fs.existsSync(file)) return {};
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const list = Object.values(data).find(Array.isArray) || [];
  const field = code === "hi" ? "hindiName" : "marathiName";
  const seeded = {};
  for (const item of list) {
    if (item?.name && item[field]) seeded[item.name.trim()] = item[field].trim();
  }
  return seeded;
};

const run = async () => {
  const source = JSON.parse(fs.readFileSync(path.join(LOCALES, "_source.json"), "utf8"));
  const all = source.strings.map((s) => s.text);

  const useBhashini = Boolean(BHASHINI_USER && BHASHINI_KEY);
  if (!GROQ_KEY && !useBhashini) {
    console.error("No GROQ_API_KEY or Bhashini credentials found. Set one in backend/.env");
    process.exit(1);
  }
  console.log(`Primary source: ${useBhashini ? "Bhashini (Govt of India)" : "Groq"}`);
  if (useBhashini && GROQ_KEY) console.log("Review pass:   Groq (scrap-domain vocabulary)");

  for (const [code, lang] of Object.entries(LANGS)) {
    if (only && only !== code) continue;

    const file = path.join(LOCALES, `${code}.json`);
    const existing = !force && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

    const seeded = seedFromMaterialData(code);
    const newlySeeded = Object.keys(seeded).filter((k) => !existing[k]).length;
    Object.assign(existing, seeded);
    if (newlySeeded) console.log(`\n${lang.name}: seeded ${newlySeeded} material names from price data`);

    const missing = all.filter((s) => !existing[s]);

    if (!missing.length) {
      fs.writeFileSync(file, JSON.stringify(existing, null, 2) + "\n");
      console.log(`\n${lang.name}: already complete (${Object.keys(existing).length} strings)`);
      continue;
    }
    console.log(`\n${lang.name}: translating ${missing.length} strings…`);

    const batches = chunk(missing, BATCH);
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      try {
        let out;
        if (useBhashini) {
          out = await callBhashini(batch, lang);
          if (GROQ_KEY) out = await reviewWithGroq(out, lang);
        } else {
          out = await callGroq(batch, lang);
        }
        let added = 0;
        for (const key of batch) {
          const value = out[key];
          if (typeof value === "string" && value.trim()) { existing[key] = value.trim(); added += 1; }
        }
        console.log(`  batch ${i + 1}/${batches.length} — ${added}/${batch.length} translated`);
      } catch (error) {
        console.warn(`  batch ${i + 1}/${batches.length} FAILED: ${error.message}`);
      }
      // Write after every batch so an interrupted run keeps its progress.
      fs.writeFileSync(file, JSON.stringify(existing, null, 2) + "\n");
      if (i < batches.length - 1) await sleep(4000); // stay under the TPM cap
    }

    const done = all.filter((s) => existing[s]).length;
    console.log(`${lang.name}: ${done}/${all.length} complete → src/locales/${code}.json`);
  }
};

run().catch((error) => { console.error(error); process.exit(1); });
