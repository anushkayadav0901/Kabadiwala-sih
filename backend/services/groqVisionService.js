import fs from "node:fs";
import path from "node:path";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const PS_CATEGORIES = ["CRT", "LCD", "PCB", "cables", "batteries", "motors", "mixed_plastic", "copper", "metal", "e_waste"];

const mimeFor = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg";
};

export const isGroqConfigured = () => Boolean(GROQ_API_KEY);

const SYSTEM_PROMPT = `You are an expert e-waste material classifier working for Indian kabadiwala (informal scrap collectors). You identify MATERIALS inside electronic waste — not the device name.

Your job: Look at the image carefully. Even if the item is broken, damaged, dismantled, or mixed with other scrap, identify the PRIMARY recoverable materials visible.

Classify into exactly ONE primary category from this list:
- CRT — cathode ray tube glass, CRT monitors/TVs, leaded glass panels
- LCD — flat LCD/LED panels, display glass, backlight assemblies (contain indium, gallium)
- PCB — printed circuit boards, green/brown boards with chips, solder, gold traces
- cables — copper wire, ethernet cables, power cables, USB cables, wire bundles
- batteries — lithium-ion cells, lead-acid batteries, button cells, swollen packs
- motors — electric motors, compressor motors, magnet-bearing assemblies, transformers, coils
- mixed_plastic — plastic casings, ABS housings, keyboard shells, polycarbonate panels
- copper — bare copper wire, copper pipes, copper scrap pieces
- metal — steel, aluminium, iron scrap, sheet metal
- e_waste — mixed e-waste that doesn't fit above, or whole devices with multiple materials

Also provide:
1. A list of ALL visible materials (even secondary ones)
2. Estimated percentage breakdown of recoverable materials
3. Condition assessment
4. Key recoverable elements (copper, gold, lithium, cobalt, neodymium, etc.)
5. Safety warnings specific to what you see

Respond ONLY in JSON:
{
  "primaryCategory": "one of the categories above",
  "materialName": "short descriptive name for the primary material",
  "allMaterials": [{"name": "...", "percentage": 40, "category": "..."}],
  "condition": "good|fair|poor|damaged|hazardous",
  "confidence": 0.0 to 1.0,
  "recoverableElements": ["copper", "gold", ...],
  "estimatedValuePerKg": number in INR,
  "safetyWarnings": ["warning1", "warning2"],
  "reasoning": "brief explanation of what you see and how you identified it"
}`;

export const deepClassify = async (filePath) => {
  if (!GROQ_API_KEY) return null;

  const imageData = fs.readFileSync(filePath).toString("base64");
  const mime = mimeFor(filePath);

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this scrap material image. Identify all materials visible, even inside broken/damaged items. Give the full JSON breakdown." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${imageData}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error("[groqVision] API error:", response.status, err);
    return null;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!PS_CATEGORIES.includes(parsed.primaryCategory)) {
      parsed.primaryCategory = "e_waste";
    }
    return { ...parsed, source: "groq_vision", model: GROQ_MODEL };
  } catch {
    console.error("[groqVision] JSON parse failed:", text.slice(0, 200));
    return null;
  }
};

export const deepEstimate = async (filePath, weight, category) => {
  if (!GROQ_API_KEY) return null;

  const imageData = fs.readFileSync(filePath).toString("base64");
  const mime = mimeFor(filePath);

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an Indian scrap market pricing expert. Estimate fair price ranges based on current Delhi NCR scrap market rates. Consider material purity, condition, and recoverable elements.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `This is ${weight}kg of ${category} scrap. Based on the image, estimate the fair price range in INR. Consider visible condition and material purity. Respond in JSON only: {"estMin": number, "estMax": number, "perKgMin": number, "perKgMax": number, "reasoning": "..."}` },
            { type: "image_url", image_url: { url: `data:${mime};base64,${imageData}` } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};
