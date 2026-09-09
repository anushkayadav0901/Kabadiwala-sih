// Optional Gemini Vision fallback for material classification.
// Falls back gracefully when GEMINI_API_KEY is not set.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Resolve the backend .env from this file, rather than from whichever folder
// was used to start Node (for example, `node backend/server.js` from the repo
// root). This must happen before the configuration constants below are read.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Gemini 2.5 Flash is no longer available to new projects. Allow an override
// for future migrations while using Google's lower-latency Flash Lite model.
// It supports image input and is sufficient for the seven material groups.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

// These are the material groups explicitly required by the SIH problem
// statement. Generic e-waste and whole-device labels are intentionally not
// accepted, because they can turn an unrelated photo into a false listing.
export const MATERIAL_CATEGORIES = ["PCB", "cables", "batteries", "LCD", "CRT", "motors", "mixed_plastic"];

const mimeFor = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".mp4": "audio/mp4" }[ext] || "image/jpeg";
};

export const isGeminiConfigured = () => Boolean(GEMINI_API_KEY);

export const classifyImage = async (filePath) => {
  if (!GEMINI_API_KEY) return null;
  const imageData = fs.readFileSync(filePath).toString("base64");
  const response = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `You validate photos for an Indian e-waste collection platform. Accept an image ONLY when its primary visible item is one of these SIH material groups: ${MATERIAL_CATEGORIES.join(", ")}.

Reject ordinary household items, people, documents, animals, food, vehicles, scenery, non-electronic scrap, and images where the e-waste material cannot be identified reliably. Whole electronic devices may be accepted only when their primary recoverable material is clear. Never guess a category just because every image needs an answer.

Respond ONLY as JSON:
{"validImage":true,"category":"one accepted category","detectedItem":"short item name","condition":"good|fair|poor|damaged|hazardous","confidence":0.0,"reasoning":"brief visual evidence"}
or
{"validImage":false,"category":null,"detectedItem":null,"confidence":0.0,"reasoning":"why this is not an acceptable e-waste material image"}` },
          { inline_data: { mime_type: mimeFor(filePath), data: imageData } }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 256, responseMimeType: "application/json" }
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini API request failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : ""}`);
  }
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (!parsed) return null;
    const category = String(parsed.category || "").trim();
    const validImage = parsed.validImage === true && MATERIAL_CATEGORIES.includes(category);
    return {
      ...parsed,
      validImage,
      invalidImage: !validImage,
      category: validImage ? category : null,
      reasoning: parsed.reasoning || "The image is not a clearly identifiable supported e-waste material."
    };
  } catch { return null; }
};

export const estimatePrice = async (filePath, weight, category, condition) => {
  if (!GEMINI_API_KEY) return null;
  const imageData = fs.readFileSync(filePath).toString("base64");
  const response = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `You are a scrap pricing expert for Indian markets. Given this ${category} scrap image (${weight} kg, condition: ${condition}), estimate a fair price range in INR. Consider current Indian scrap market rates. Respond in JSON: {"estMin":number,"estMax":number,"reasoning":"..."}` },
          { inline_data: { mime_type: mimeFor(filePath), data: imageData } }
        ]
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
    })
  });
  if (!response.ok) return null;
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
};

export const transcribeAudio = async (filePath) => {
  if (!GEMINI_API_KEY) return null;
  const imageData = fs.readFileSync(filePath).toString("base64");
  const response = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Transcribe this WhatsApp voice note exactly. Return JSON only: {\"transcript\":\"...\"}." }, { inline_data: { mime_type: mimeFor(filePath), data: imageData } }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 256 }
    })
  });
  if (!response.ok) return null;
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { transcript: text.trim() };
  } catch { return { transcript: text.trim() }; }
};

export const compareHandoverImages = async (originalPath, handoverPath, category) => {
  if (!GEMINI_API_KEY) return null;
  const parts = [
    { text: `You are a scrap verification expert. Compare these two images of ${category || "scrap"} material. The first is the original listing photo, the second is the handover verification photo. Determine if they show the same material. Respond in JSON: {"isMatch":boolean,"matchScore":0-100,"verificationStatus":"verified|warning|mismatch","reasoning":"..."}` }
  ];
  if (originalPath && fs.existsSync(originalPath)) {
    parts.push({ inline_data: { mime_type: mimeFor(originalPath), data: fs.readFileSync(originalPath).toString("base64") } });
  }
  if (handoverPath && fs.existsSync(handoverPath)) {
    parts.push({ inline_data: { mime_type: mimeFor(handoverPath), data: fs.readFileSync(handoverPath).toString("base64") } });
  }
  if (parts.length < 3) return null;
  const response = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 512 } })
  });
  if (!response.ok) return null;
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
};
