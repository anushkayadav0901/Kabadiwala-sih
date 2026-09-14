import "dotenv/config";
import crypto from "node:crypto";
import twilio from "twilio";
import Collector from "../models/Collector.js";
import Lot from "../models/Lot.js";
import Price from "../models/Price.js";
import Recycler from "../models/Recycler.js";
import VoiceSession from "../models/VoiceSession.js";
import { calculateCriticalMineralBounty } from "./criticalMineralBounty.js";
import {
  PROMPTS,
  WELCOME_SEGMENTS,
  materialForDigit,
  sayLanguageFor,
  languageForDigit,
  priceLine,
  recyclerLine,
  noRecyclerLine,
  saleEstimateLine,
  referenceCodeLine,
  safetyLine,
  confirmPincodeLine,
  spellOutCode
} from "./ivrPrompts.js";

const { VoiceResponse } = twilio.twiml;
const GATHER_ACTION = "/api/voice/gather";

// Which broad group a menu category falls into, for matching against
// Recycler.materialsAccepted — mirrors the grouping whatsappService.js uses,
// kept local here since the two channels evolve independently for now.
const recyclerGroupFor = (category = "") => {
  const normalized = String(category).toLowerCase();
  if (["pcb", "lcd", "crt", "mobile", "television", "e_waste"].includes(normalized)) return "e_waste";
  if (["batteries", "battery", "motors"].includes(normalized)) return "hazardous";
  if (["mixed_plastic", "plastic"].includes(normalized)) return "plastic";
  if (["copper", "aluminum", "brass", "steel", "cables", "metal"].includes(normalized)) return "metal";
  return normalized;
};

const normalizePhone = (value = "") => {
  const raw = String(value).trim();
  return raw.startsWith("+") ? `+${raw.slice(1).replace(/\D/g, "")}` : raw.replace(/\D/g, "");
};

const formatAmount = (value) => Math.round(Number(value || 0)).toLocaleString("en-IN");
const rangeText = (low, high) => `${formatAmount(low)} to ${formatAmount(high)}`;

const getOrCreateCollector = async (phoneNumber, language) => {
  let collector = await Collector.findOne({ phone: phoneNumber });
  if (!collector) {
    collector = await Collector.create({
      name: `Voice Collector ${phoneNumber.slice(-4)}`,
      phone: phoneNumber,
      channel: "voice",
      preferredLanguage: language || "en"
    });
  } else if (language && collector.preferredLanguage !== language) {
    collector.preferredLanguage = language;
    await collector.save();
  }
  return collector;
};

const priceFor = async (category) => Price.findOne({ materialCategory: category }).sort({ priceDate: -1 });

// Finds an authorized recycler for the material group, preferring one whose
// serviceArea or address mentions the caller's PIN code or district (first 3
// digits), and falling back to the highest-rated match otherwise. Note: this
// only works as well as the seeded serviceArea data — worth populating those
// with real PIN codes/prefixes rather than free-text area names.
const findRecyclerForCall = async (category, pincode) => {
  const group = recyclerGroupFor(category);
  const candidates = await Recycler.find({ authorized: true, materialsAccepted: group })
    .sort({ rating: -1 })
    .limit(20);
  if (!candidates.length) return null;
  if (pincode) {
    const exact = candidates.find(
      (r) => (r.serviceArea || []).some((area) => String(area).includes(pincode)) || String(r.address || "").includes(pincode)
    );
    if (exact) return exact;
    const districtPrefix = pincode.slice(0, 3);
    const nearby = candidates.find((r) => (r.serviceArea || []).some((area) => String(area).startsWith(districtPrefix)));
    if (nearby) return nearby;
  }
  return candidates[0];
};

const createLotFromCall = async (collector, session) => {
  const material = session.pendingMaterial;
  const lot = await Lot.create({
    collector: collector._id,
    materials: [{ ...material, weightKg: session.pendingWeight, pricePerKg: session.pendingEstimate / session.pendingWeight }],
    totalWeight: session.pendingWeight,
    estimatedValue: session.pendingEstimate,
    criticalMineralBounty: calculateCriticalMineralBounty([material], session.pendingEstimate),
    matchedRecycler: session.pendingRecycler || null,
    status: session.pendingRecycler ? "matched" : "created",
    handoverReference: `KB-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`
  });
  return lot;
};

const resetToMainMenu = (session) => {
  session.state = "main_menu";
  session.intent = null;
  session.pendingMaterial = null;
  session.pendingPincode = null;
  session.pendingWeight = null;
  session.pendingEstimate = null;
  session.pendingRecycler = null;
};

const getSession = async (phoneNumber, callSid) => {
  let session = await VoiceSession.findOne({ phoneNumber });
  if (!session) {
    session = await VoiceSession.create({ phoneNumber, callSid, state: "awaiting_language" });
  } else {
    session.callSid = callSid;
  }
  return session;
};

const saveSession = async (session) => {
  session.lastMessageAt = new Date();
  await session.save();
};

// --- TwiML builders -------------------------------------------------------

const say = (twiml, lang, text) => twiml.say({ language: sayLanguageFor(lang) }, text);

// Speaks a prompt then waits for keypad input, routing whatever is pressed
// back to /api/voice/gather. If nothing is pressed before the timeout, we
// say a short goodbye and hang up rather than leaving a silent line open.
const gatherDigits = (lang, promptText, { numDigits = 1, finishOnKey = "", timeout = 8 } = {}) => {
  const twiml = new VoiceResponse();
  const gather = twiml.gather({ input: "dtmf", numDigits, finishOnKey, action: GATHER_ACTION, method: "POST", timeout });
  say(gather, lang, promptText);
  say(twiml, lang, PROMPTS.goodbye[lang]);
  twiml.hangup();
  return twiml.toString();
};

const hangupWith = (lang, text) => {
  const twiml = new VoiceResponse();
  say(twiml, lang, text);
  twiml.hangup();
  return twiml.toString();
};

const mainMenuTwiml = (lang) => gatherDigits(lang, PROMPTS.mainMenu[lang], { numDigits: 1 });

const materialMenuTwiml = (lang, askText) =>
  gatherDigits(lang, `${askText} ${PROMPTS.materialMenu[lang]}`, { numDigits: 1 });

// --- Entry points ----------------------------------------------------------

// First hit when a call comes in — nobody has pressed anything yet, so we
// don't know the caller's language. Says the welcome line in all three and
// waits for a single digit (1/2/3) to pick one.
export const buildIncomingTwiml = async ({ from, callSid }) => {
  const phoneNumber = normalizePhone(from);
  await VoiceSession.findOneAndUpdate(
    { phoneNumber },
    {
      phoneNumber,
      callSid,
      state: "awaiting_language",
      language: null,
      intent: null,
      pendingMaterial: null,
      pendingPincode: null,
      pendingWeight: null,
      pendingEstimate: null,
      pendingRecycler: null,
      needsCallback: false,
      lastMessageAt: new Date()
    },
    { upsert: true }
  );

  const twiml = new VoiceResponse();
  const gather = twiml.gather({ input: "dtmf", numDigits: 1, finishOnKey: "", action: GATHER_ACTION, method: "POST", timeout: 10 });
  for (const segment of WELCOME_SEGMENTS) say(gather, segment.lang, segment.text);
  // No input at all: default to English rather than just hanging up silently.
  say(twiml, "en", PROMPTS.goodbye.en);
  twiml.hangup();
  return twiml.toString();
};

// Every subsequent keypress hits this. Routes on session.state, mirroring the
// if/else-by-state pattern whatsappService.js uses for its text-based flow.
export const buildGatherTwiml = async ({ from, callSid, digits = "" }) => {
  const phoneNumber = normalizePhone(from);
  const session = await getSession(phoneNumber, callSid);
  const lang = session.language || "en";
  const digit = String(digits).trim();

  // Universal "back to main menu" — available from any material sub-menu.
  if (digit === "0" && session.state !== "awaiting_language") {
    resetToMainMenu(session);
    await saveSession(session);
    return mainMenuTwiml(lang);
  }

  if (session.state === "awaiting_language") {
    const chosen = languageForDigit(digit);
    if (!chosen) {
      const twiml = new VoiceResponse();
      const gather = twiml.gather({ input: "dtmf", numDigits: 1, finishOnKey: "", action: GATHER_ACTION, method: "POST", timeout: 10 });
      for (const segment of WELCOME_SEGMENTS) say(gather, segment.lang, segment.text);
      twiml.hangup();
      return twiml.toString();
    }
    session.language = chosen;
    session.state = "main_menu";
    await saveSession(session);
    await getOrCreateCollector(phoneNumber, chosen);
    return mainMenuTwiml(chosen);
  }

  if (session.state === "main_menu") {
    if (digit === "1") {
      session.state = "awaiting_material_price";
      session.intent = "price";
      await saveSession(session);
      return materialMenuTwiml(lang, PROMPTS.askMaterialForPrice[lang]);
    }
    if (digit === "2") {
      session.state = "awaiting_material_recycler";
      session.intent = "recycler";
      await saveSession(session);
      return materialMenuTwiml(lang, PROMPTS.askMaterialForRecycler[lang]);
    }
    if (digit === "3") {
      session.state = "awaiting_material_safety";
      session.intent = "safety";
      await saveSession(session);
      return materialMenuTwiml(lang, PROMPTS.askMaterialForSafety[lang]);
    }
    if (digit === "4") {
      session.state = "awaiting_material_sale";
      session.intent = "sale";
      await saveSession(session);
      return materialMenuTwiml(lang, PROMPTS.askMaterialForSale[lang]);
    }
    if (digit === "9") {
      session.needsCallback = true;
      await saveSession(session);
      return hangupWith(lang, PROMPTS.callbackRequested[lang]);
    }
    return gatherDigits(lang, `${PROMPTS.invalidDigit[lang]} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
  }

  // The four "pick a material" states all resolve to the same next step,
  // branching only on session.intent to decide what happens after.
  if (
    ["awaiting_material_price", "awaiting_material_recycler", "awaiting_material_safety", "awaiting_material_sale"].includes(
      session.state
    )
  ) {
    const material = materialForDigit(digit);
    if (!material) {
      return materialMenuTwiml(lang, PROMPTS.invalidDigit[lang]);
    }
    session.pendingMaterial = {
      name: material.label[lang],
      category: material.category,
      description: `${material.label.en} selected via voice IVR.`,
      condition: "unknown"
    };

    if (session.intent === "price") {
      const price = await priceFor(material.category);
      resetToMainMenu(session);
      await saveSession(session);
      if (!price) return gatherDigits(lang, `${PROMPTS.invalidDigit[lang]} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
      const range = rangeText(price.marketRangeMin ?? price.buyingPrice, price.marketRangeMax ?? price.quotedPrice);
      return gatherDigits(lang, `${priceLine(lang, material.label[lang], range)} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
    }

    if (session.intent === "safety") {
      resetToMainMenu(session);
      await saveSession(session);
      return gatherDigits(lang, `${safetyLine(lang, material.label[lang])} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
    }

    // recycler and sale intents both need a PIN code next.
    session.state = "awaiting_pincode";
    await saveSession(session);
    return gatherDigits(lang, PROMPTS.askPincode[lang], { numDigits: 6, finishOnKey: "#", timeout: 20 });
  }

  if (session.state === "awaiting_pincode") {
    if (!/^\d{6}$/.test(digit)) {
      return gatherDigits(lang, PROMPTS.invalidPincode[lang], { numDigits: 6, finishOnKey: "#", timeout: 20 });
    }
    session.pendingPincode = digit;
    session.state = "confirming_pincode";
    await saveSession(session);
    return gatherDigits(lang, confirmPincodeLine(lang, spellOutCode(digit)), { numDigits: 1 });
  }

  if (session.state === "confirming_pincode") {
    if (digit === "2") {
      session.state = "awaiting_pincode";
      session.pendingPincode = null;
      await saveSession(session);
      return gatherDigits(lang, PROMPTS.askPincode[lang], { numDigits: 6, finishOnKey: "#", timeout: 20 });
    }
    if (digit !== "1") {
      return gatherDigits(lang, `${PROMPTS.invalidDigit[lang]} ${confirmPincodeLine(lang, spellOutCode(session.pendingPincode))}`, {
        numDigits: 1
      });
    }
    const pincode = session.pendingPincode;
    const recycler = await findRecyclerForCall(session.pendingMaterial.category, pincode);
    session.pendingRecycler = recycler?._id || null;

    if (session.intent === "recycler") {
      resetToMainMenu(session);
      await saveSession(session);
      if (!recycler) return gatherDigits(lang, `${noRecyclerLine[lang]} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
      const ratingText = typeof recycler.rating === "number" ? recycler.rating.toFixed(1) : "4.5";
      const line = recyclerLine(lang, recycler.name, ratingText, recycler.address || "");
      return gatherDigits(lang, `${line} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
    }

    // sale intent continues on to weight capture.
    session.state = "awaiting_weight";
    await saveSession(session);
    return gatherDigits(lang, PROMPTS.askWeight[lang], { numDigits: 4, finishOnKey: "#", timeout: 20 });
  }

  if (session.state === "awaiting_weight") {
    const weight = Number(digit);
    if (!weight || weight <= 0 || weight > 5000) {
      return gatherDigits(lang, PROMPTS.invalidWeight[lang], { numDigits: 4, finishOnKey: "#", timeout: 20 });
    }
    const price = await priceFor(session.pendingMaterial.category);
    if (!price) {
      resetToMainMenu(session);
      await saveSession(session);
      return gatherDigits(lang, `${PROMPTS.invalidDigit[lang]} ${PROMPTS.mainMenu[lang]}`, { numDigits: 1 });
    }
    const low = price.marketRangeMin ?? price.buyingPrice;
    const high = price.marketRangeMax ?? price.quotedPrice;
    session.pendingWeight = weight;
    session.pendingEstimate = Number((((low + high) / 2) * weight).toFixed(2));
    session.state = "awaiting_confirmation";
    await saveSession(session);
    const estimateLine = saleEstimateLine(lang, weight, session.pendingMaterial.name, formatAmount(session.pendingEstimate));
    return gatherDigits(lang, `${estimateLine} ${PROMPTS.confirmSalePrompt[lang]}`, { numDigits: 1 });
  }

  if (session.state === "awaiting_confirmation") {
    if (digit === "2") {
      resetToMainMenu(session);
      await saveSession(session);
      return hangupWith(lang, PROMPTS.saleCancelled[lang]);
    }
    if (digit !== "1") {
      return gatherDigits(lang, `${PROMPTS.invalidDigit[lang]} ${PROMPTS.confirmSalePrompt[lang]}`, { numDigits: 1 });
    }
    const collector = await getOrCreateCollector(phoneNumber, lang);
    const lot = await createLotFromCall(collector, session);
    session.lastLotReference = lot.handoverReference;
    resetToMainMenu(session);
    await saveSession(session);
    return hangupWith(lang, referenceCodeLine(lang, spellOutCode(lot.handoverReference)));
  }

  // Shouldn't normally be reached, but fail safe back to the main menu.
  resetToMainMenu(session);
  await saveSession(session);
  return mainMenuTwiml(lang);
};