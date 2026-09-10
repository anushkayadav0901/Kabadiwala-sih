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

// Public Kabadiwala-style material catalogue used by manual and online AI
// selection. It is deliberately constrained so unrelated photos are invalid.
export const MATERIAL_CATEGORIES = [
  "newspaper", "books", "cardboard", "magazine", "hard_plastic", "soft_plastic_film", "iron_scrap", "stainless_steel", "copper_scrap", "aluminium_scrap", "brass_scrap", "nickel_scrap", "electrical_panel", "oil_tin_empty", "almirah_iron_steel", "mixed_metal", "copper_wire_scrap", "ac_copper_2t_window", "ac_copper_15t_window", "ac_copper_1t_window", "ac_aluminium_2t_window", "ac_aluminium_15t_window", "ac_aluminium_1t_window", "split_ac_1t_copper", "split_ac_15t_copper", "split_ac_2t_copper", "split_ac_1t_aluminium", "split_ac_15t_aluminium", "split_ac_2t_aluminium", "inverter_ac_1t_copper", "inverter_ac_15t_copper", "inverter_ac_2t_copper", "refrigerator_single_door", "refrigerator_double_door", "washing_machine_single_drum", "washing_machine_semi_auto", "washing_machine_front_load", "washing_machine_top_load", "dishwasher", "microwave_oven", "geyser_steel_iron", "geyser_copper", "copper_fan", "electric_motor_copper", "copper_inverter", "black_battery_lead", "white_battery_inverter", "generator_scrap", "air_cooler_aluminium", "air_cooler_copper", "lithium_battery", "lithium_car_bike_battery", "inverter_with_battery", "treadmill", "ev_charging_station", "laptop_screen", "desktop_cpu", "crt_monitor", "lcd_led_monitor", "crt_television", "printer_scan", "laser_printer", "ups_e_waste", "mixed_e_waste", "car_scrap_full", "scooter_scrap", "bike_motorcycle_scrap", "bicycle_scrap", "electric_bike", "electric_car", "smartphone_scrap", "basic_mobile_phone", "tablet_scrap", "old_cooking_oil", "hard_drive_scrap", "transformer_scrap", "solar_scrap", "server_scrap", "speaker_scrap"
];

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
          { text: `You validate photos for an Indian kabadiwala scrap collection platform. Accept an image ONLY when its primary visible item belongs to one of these catalogue IDs: ${MATERIAL_CATEGORIES.join(", ")}.

Use the exact ID for the clearly visible catalogue item. For appliances, identify the appliance, type, and copper/aluminium/tonnage only when visually reliable; otherwise choose the closest general item, such as mixed_e_waste. Reject people, documents, animals, food, scenery, reusable non-scrap household goods, and images where a sellable material cannot be identified reliably. Never guess a category just because every image needs an answer.

Respond ONLY as JSON:
{"validImage":true,"category":"one catalogue ID","detectedItem":"short item name","condition":"good|fair|poor|damaged|hazardous","confidence":0.0,"reasoning":"brief visual evidence"}
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
      reasoning: parsed.reasoning || "The image is not a clearly identifiable sellable scrap material."
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
