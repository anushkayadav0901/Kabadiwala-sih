// Optional Gemini Vision fallback for material classification.
// Falls back gracefully when GEMINI_API_KEY is not set.

import fs from "node:fs";
import path from "node:path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

const CATEGORIES = ["PCB", "copper", "cables", "batteries", "LCD", "CRT", "motors", "mixed_plastic", "metal", "e_waste"];

const mimeFor = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }[ext] || "image/jpeg";
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
          { text: `You are a scrap material classifier for Indian kabadiwala (waste collectors). Classify this image into exactly one category from: ${CATEGORIES.join(", ")}. Respond in JSON: {"category":"...","detectedItem":"...","condition":"good|fair|poor","confidence":0.0-1.0,"reasoning":"..."}` },
          { inline_data: { mime_type: mimeFor(filePath), data: imageData } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
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
