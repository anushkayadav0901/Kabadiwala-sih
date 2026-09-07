import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Collector from "../models/Collector.js";
import Lot from "../models/Lot.js";
import Price from "../models/Price.js";
import Recycler from "../models/Recycler.js";
import WhatsAppSession from "../models/WhatsAppSession.js";
import { calculateCriticalMineralBounty } from "./criticalMineralBounty.js";
import { classifyImage, isGeminiConfigured, transcribeAudio } from "./geminiService.js";

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const uploadsDir = path.resolve("uploads");

const categoryAliases = {
  pcb: "PCB",
  circuit: "PCB",
  copper: "copper",
  cable: "cables",
  cables: "cables",
  battery: "batteries",
  batteries: "batteries",
  lithium: "batteries",
  lcd: "LCD",
  led: "LCD",
  television: "LCD",
  tv: "LCD",
  monitor: "LCD",
  screen: "LCD",
  crt: "CRT",
  motor: "motors",
  motors: "motors",
  metal: "metal",
  "e-waste": "e_waste",
  ewaste: "e_waste"
};

const normalizePhone = (value = "") => {
  const raw = String(value).replace(/^whatsapp:/i, "").trim();
  return raw.startsWith("+") ? `+${raw.slice(1).replace(/\D/g, "")}` : raw.replace(/\D/g, "");
};
const normalizeCategory = (value = "") => categoryAliases[String(value).toLowerCase().trim()] || String(value).trim();
const recyclerGroupFor = (category = "") => {
  const normalized = String(category).toLowerCase();
  if (["pcb", "lcd", "crt", "mobile", "television", "keyboard", "mouse", "printer", "microwave", "player", "e_waste"].includes(normalized)) return "e_waste";
  if (["batteries", "battery", "motors"].includes(normalized)) return "hazardous";
  if (["mixed_plastic", "plastic"].includes(normalized)) return "plastic";
  if (["copper", "aluminum", "brass", "steel", "cables", "metal"].includes(normalized)) return "metal";
  return normalized;
};
const parseWeight = (text = "") => {
  const match = String(text).match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:kg|kilo(?:s)?| किलो)?(?:\s|$)/i);
  return match ? Number(match[1]) : null;
};
const priceCategory = (category) => normalizeCategory(category) || "e_waste";
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const priceFor = async (category) => Price.findOne({ materialCategory: priceCategory(category) }).sort({ priceDate: -1 });

const findPriceQuery = (text) => {
  const lower = String(text).toLowerCase();
  const alias = Object.keys(categoryAliases).find((key) => lower.includes(key));
  return alias ? normalizeCategory(alias) : null;
};

const findRecycler = async (material, collector) => {
  const query = { authorized: true, materialsAccepted: recyclerGroupFor(material.category || "e_waste") };
  const recyclers = await Recycler.find(query).sort({ rating: -1 }).limit(10);
  return recyclers.find((recycler) => {
    if (!collector?.locationLat || !collector?.locationLng) return true;
    return Number.isFinite(recycler.locationLat) && Number.isFinite(recycler.locationLng);
  }) || null;
};

const getOrCreateCollector = async (phoneNumber) => {
  let collector = await Collector.findOne({ phone: phoneNumber });
  if (!collector) {
    collector = await Collector.create({
      name: `WhatsApp Collector ${phoneNumber.slice(-4)}`,
      phone: phoneNumber,
      channel: "whatsapp",
      preferredLanguage: "en"
    });
  }
  return collector;
};

const getSession = async (phoneNumber) => {
  let session = await WhatsAppSession.findOne({ phoneNumber });
  if (!session) return WhatsAppSession.create({ phoneNumber });
  if (Date.now() - new Date(session.lastMessageAt).getTime() > SESSION_TIMEOUT_MS) {
    session.state = "idle";
    session.pendingMaterial = null;
    session.pendingWeight = null;
    session.pendingEstimate = null;
    session.pendingRecycler = null;
  }
  return session;
};

const saveSession = async (session) => {
  session.lastMessageAt = new Date();
  await session.save();
};

const priceReply = async (category, weight = null) => {
  const price = await priceFor(category);
  if (!price) return `I could not find today's price for ${category}. Try PCB, copper, battery, LCD, or metal.`;
  const low = price.marketRangeMin ?? price.buyingPrice;
  const high = price.marketRangeMax ?? price.quotedPrice;
  const range = `${formatMoney(low)}–${formatMoney(high)}/kg`;
  if (!weight) return `Today's fair price for ${category}: ${range}. Send a photo or ask another material's rate.`;
  const estimate = Number(((low + high) / 2 * weight).toFixed(2));
  return { price, estimate, text: `${weight}kg ${category} is approximately ${formatMoney(estimate)} at today's fair range (${range}).` };
};

const materialFromClassification = (result) => {
  const category = normalizeCategory(result.category || result.detectedItem || "e_waste");
  return {
    name: result.detectedItem || category,
    category,
    description: result.reasoning || `${category} detected from WhatsApp photo.`,
    condition: result.condition || "unknown",
    classificationConfidence: Number(result.confidence || 0) * (Number(result.confidence || 0) <= 1 ? 100 : 1)
  };
};

const downloadMedia = async (url, mediaType = "image/jpeg") => {
  const headers = {};
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    headers.Authorization = `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Twilio media download failed with ${response.status}`);
  const extension = mediaType.includes("audio") ? ".ogg" : mediaType.includes("png") ? ".png" : ".jpg";
  const filePath = path.join(uploadsDir, `whatsapp-${crypto.randomUUID()}${extension}`);
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  return filePath;
};

const createWhatsAppLot = async (collector, session) => {
  const material = session.pendingMaterial;
  const lot = await Lot.create({
    collector: collector._id,
    materials: [{ ...material, weightKg: session.pendingWeight, pricePerKg: session.pendingEstimate / session.pendingWeight }],
    totalWeight: session.pendingWeight,
    estimatedValue: session.pendingEstimate,
    criticalMineralBounty: calculateCriticalMineralBounty([material], session.pendingEstimate),
    handoverReference: `KB-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`
  });
  return lot;
};

const resetSession = (session) => {
  session.state = "idle";
  session.pendingMaterial = null;
  session.pendingWeight = null;
  session.pendingEstimate = null;
  session.pendingRecycler = null;
};

export const processWhatsAppMessage = async ({ from, body = "", mediaUrl, mediaType }) => {
  const phoneNumber = normalizePhone(from);
  const collector = await getOrCreateCollector(phoneNumber);
  const session = await getSession(phoneNumber);
  const text = String(body).trim();
  const lower = text.toLowerCase();

  if (lower === "safety" || lower === "help") {
    return "Safety: do not burn cables, break screens, or open batteries. Keep batteries dry and isolate swollen cells. Send a scrap photo to begin.";
  }

  if (session.state === "awaiting_weight") {
    const weight = parseWeight(text);
    if (!weight || weight <= 0 || weight > 100000) return "Please reply with the weight in kg, for example: 5 or 5 kilo.";
    const quote = await priceReply(session.pendingMaterial.category, weight);
    const recycler = await findRecycler(session.pendingMaterial, collector);
    session.pendingWeight = weight;
    session.pendingEstimate = quote.estimate;
    session.pendingRecycler = recycler?._id || null;
    session.state = "awaiting_confirmation";
    await saveSession(session);
    const buyer = recycler ? `Nearest authorized recycler: ${recycler.name} (${recycler.rating.toFixed(1)}/5 trust rating).` : "No authorized recycler is currently listed for this material.";
    return `${quote.text}\n${buyer}\nReply YES to create a lot, or SKIP to only check the price.`;
  }

  if (session.state === "awaiting_confirmation") {
    if (["skip", "no", "cancel"].includes(lower)) {
      resetSession(session);
      await saveSession(session);
      return "Okay, no lot was created. Send another material photo or ask a price anytime.";
    }
    if (!["yes", "y", "haan", "हां"].includes(lower)) return "Reply YES to create this lot, or SKIP to cancel.";
    const lot = await createWhatsAppLot(collector, session);
    const reference = lot.handoverReference;
    resetSession(session);
    await saveSession(session);
    return `Lot created! Reference: ${reference}\nShow this code to the recycler.\nSafety: don't burn cables or leak battery acid. Reply SAFETY for details.`;
  }

  if (mediaUrl) {
    if (!isGeminiConfigured()) return "Photo received, but image classification is not configured. Please ask the administrator to set GEMINI_API_KEY, then send the photo again.";
    const filePath = await downloadMedia(mediaUrl, mediaType);
    try {
      const isAudio = String(mediaType).toLowerCase().startsWith("audio/");
      const result = isAudio ? await transcribeAudio(filePath) : await classifyImage(filePath);
      if (!result) return isAudio ? "I received your voice note but could not transcribe it. Please try a shorter voice note or type your query." : "I could not identify that material. Please send a clearer photo or ask its price by text.";
      if (isAudio) {
        const transcript = result.transcript || result.text || "";
        return transcript ? processWhatsAppMessage({ from, body: transcript }) : "I could not hear the voice note clearly. Please try again or type your query.";
      }
      const material = materialFromClassification(result);
      const price = await priceReply(material.category);
      session.pendingMaterial = material;
      session.state = "awaiting_weight";
      await saveSession(session);
      return `This looks like ${material.name} (${Math.round(material.classificationConfidence)}% confidence).\n${price}\nHow much weight do you have in kg?`;
    } finally {
      await fs.unlink(filePath).catch(() => {});
    }
  }

  const category = findPriceQuery(text);
  if (category) return priceReply(category);
  return "Send a scrap photo for classification, or type a price query such as 'PCB rate?' or '5 kilo copper rate'. Reply SAFETY for handling guidance.";
};

export const whatsappPhone = normalizePhone;
