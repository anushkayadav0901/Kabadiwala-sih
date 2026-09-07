import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Price from "../models/Price.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Central master document paths
const BACKEND_RATES_FILE = path.join(__dirname, "../data/live_scrap_rates.json");
const FRONTEND_RATES_FILE = path.join(__dirname, "../../frontend/src/data/liveScrapRates.json");

// Default reference city: Central Delhi (City ID: 113)
const DEFAULT_CITY_ID = 113;
const DEFAULT_CITY_NAME = "Central Delhi, Delhi NCR";

// All scrap items supported across Kabadiwala Connect platform
const PLATFORM_ITEMS = [
  {
    id: "mat_pcb",
    name: "E-Waste PCB Board",
    hindiName: "ई-वेस्ट पीसीबी बोर्ड",
    marathiName: "ई-कचरा पीसीबी बोर्ड",
    category: "e_waste",
    mandiCategory: "PCB",
    mandiSubcategory: "Laptop-Server Board",
    fallbackRate: 720,
    unit: "kg",
    icon: "💻",
    confidence: 96,
    shortDescription: "Green circuit boards from server racks, motherboards, and electronics.",
    safetyWarning: "Do not break or crush circuit boards. Toxic dust may inhale."
  },
  {
    id: "mat_mobile",
    name: "Mobile Phone Scrap",
    hindiName: "मोबाइल फोन स्क्रैप",
    marathiName: "मोबाईल फोन स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Li-ion Battery",
    mandiSubcategory: "Smartphone",
    fallbackRate: 702,
    unit: "kg",
    icon: "📱",
    confidence: 97,
    shortDescription: "Smartphones and feature phones rich in recoverable gold, copper, and cobalt.",
    safetyWarning: "Remove and isolate damaged or swollen lithium batteries safely."
  },
  {
    id: "mat_television",
    name: "Television / Monitor Scrap",
    hindiName: "टेलीविजन / मॉनिटर स्क्रैप",
    marathiName: "टीव्ही स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Display",
    mandiSubcategory: "LCD",
    fallbackRate: 130,
    unit: "kg",
    icon: "📺",
    confidence: 93,
    shortDescription: "Flat screen LCD/LED TVs, CRT monitors, chassis, and motherboards.",
    safetyWarning: "Handle display glass carefully; avoid breaking backlight tubes."
  },
  {
    id: "mat_keyboard",
    name: "Computer Keyboard Scrap",
    hindiName: "कीबोर्ड स्क्रैप",
    marathiName: "कीबोर्ड स्क्रॅप",
    category: "e_waste",
    mandiCategory: "E-waste",
    mandiSubcategory: "E-waste without accessories",
    fallbackRate: 120,
    unit: "kg",
    icon: "⌨️",
    confidence: 92,
    shortDescription: "Membrane and mechanical keyboards with internal traces and plastic frames.",
    safetyWarning: "Do not burn plastic frames. Store dry."
  },
  {
    id: "mat_mouse",
    name: "Computer Mouse Scrap",
    hindiName: "कंप्यूटर माउस स्क्रैप",
    marathiName: "माऊस स्क्रॅप",
    category: "e_waste",
    mandiCategory: "E-waste",
    mandiSubcategory: "E-waste without accessories",
    fallbackRate: 100,
    unit: "kg",
    icon: "🖱️",
    confidence: 90,
    shortDescription: "Optical and trackball mice with internal micro-PCBs, switches, and wiring.",
    safetyWarning: "Cut cables cleanly; avoid open flame stripping."
  },
  {
    id: "mat_printer",
    name: "Printer & Scanner Scrap",
    hindiName: "प्रिंटर व स्कैनर स्क्रैप",
    marathiName: "प्रिंटर स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Home Appliance",
    mandiSubcategory: "Printer",
    fallbackRate: 85,
    unit: "kg",
    icon: "🖨️",
    confidence: 91,
    shortDescription: "Inkjet and laser printers containing stepper motors, logic boards, and plastics.",
    safetyWarning: "Avoid inhaling toner cartridge powder; wear protective mask."
  },
  {
    id: "mat_microwave",
    name: "Microwave Oven Scrap",
    hindiName: "माइक्रोवेव ओवन स्क्रैप",
    marathiName: "मायक्रोव्हेव्ह स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Home Appliance",
    mandiSubcategory: "Microwave & Oven",
    fallbackRate: 90,
    unit: "kg",
    icon: "📦",
    confidence: 88,
    shortDescription: "Consumer appliance e-waste with heavy steel casing, magnetron, and motor.",
    safetyWarning: "Do not dismantle high voltage capacitors or magnetron ceramic seals."
  },
  {
    id: "mat_player",
    name: "Media / DVD Player Scrap",
    hindiName: "मीडिया / डीवीडी प्लेयर स्क्रैप",
    marathiName: "प्लेअर स्क्रॅप",
    category: "e_waste",
    mandiCategory: "E-waste",
    mandiSubcategory: "E-waste with accessories",
    fallbackRate: 95,
    unit: "kg",
    icon: "📻",
    confidence: 89,
    shortDescription: "Audio decoders, CD/DVD drives, transformer coils, and metal chassis.",
    safetyWarning: "Handle optical pick-up assembly with care."
  },
  {
    id: "mat_washing_machine",
    name: "Washing Machine E-Scrap",
    hindiName: "वाशिंग मशीन स्क्रैप",
    marathiName: "वॉशिंग मशिन स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Washing Machine",
    mandiSubcategory: "Automatic - Top Load",
    fallbackRate: 190,
    unit: "kg",
    icon: "⚙️",
    confidence: 94,
    shortDescription: "Heavy home appliance with large copper induction motor and electronic control board.",
    safetyWarning: "Beware of heavy drum balance weights and sharp stainless steel edges."
  },
  {
    id: "mat_battery",
    name: "Battery (Lead Acid & Lithium)",
    hindiName: "बैटरी स्क्रैप",
    marathiName: "बॅटरी स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Li-ion Battery",
    mandiSubcategory: "Laptop",
    fallbackRate: 298,
    unit: "kg",
    icon: "🔋",
    confidence: 98,
    shortDescription: "Vehicle, inverter, and electronic batteries. High value hazardous e-waste scrap.",
    safetyWarning: "Do not puncture or leak battery acid. Wear rubber gloves and goggles."
  },
  {
    id: "mat_copper",
    name: "Copper Wire & Scrap (Laal Maal)",
    hindiName: "तांबा तार (लाल माल)",
    marathiName: "तांब्याची तार",
    category: "metal",
    mandiCategory: "Copper",
    mandiSubcategory: "Laal Maal",
    fallbackRate: 1283,
    unit: "kg",
    icon: "🔌",
    confidence: 98,
    shortDescription: "High purity heavy copper wire, stripped or unstripped cables.",
    safetyWarning: "Never burn rubber coating off copper wire. Peel manually with gloves."
  },
  {
    id: "mat_aluminium",
    name: "Aluminium Wire & Section",
    hindiName: "एल्युमिनियम तार व सेक्शन",
    marathiName: "अ‍ॅल्युमिनियम स्क्रॅप",
    category: "metal",
    mandiCategory: "Aluminium",
    mandiSubcategory: "Wire Scrap",
    fallbackRate: 336,
    unit: "kg",
    icon: "🪙",
    confidence: 95,
    shortDescription: "Aluminium conductors, door/window section cuttings, and utensil scrap.",
    safetyWarning: "Keep segregated from iron contamination to preserve scrap value."
  },
  {
    id: "mat_brass",
    name: "Brass / Pitul",
    hindiName: "पीतल",
    marathiName: "पितळ",
    category: "metal",
    mandiCategory: "Brass",
    mandiSubcategory: "Purja",
    fallbackRate: 520,
    unit: "kg",
    icon: "🎺",
    confidence: 92,
    shortDescription: "Water taps, brass utensils, locks, valves, and decorative brass metal.",
    safetyWarning: "Clean off grease before selling to get maximum scrap price."
  },
  {
    id: "mat_iron",
    name: "Iron & Steel Scrap (Piece)",
    hindiName: "लोहा व स्टील स्क्रैप",
    marathiName: "लोखंड स्क्रॅप",
    category: "metal",
    mandiCategory: "Iron",
    mandiSubcategory: "Piece to Piece",
    fallbackRate: 36,
    unit: "kg",
    icon: "🔩",
    confidence: 96,
    shortDescription: "Structural iron, reinforcement bars, sheet cuttings, and metal parts.",
    safetyWarning: "Watch out for sharp rusted edges and metal splinters."
  },
  {
    id: "mat_fridge",
    name: "Refrigerator / Fridge Scrap",
    hindiName: "फ्रिज स्क्रैप",
    marathiName: "फ्रिज स्क्रॅप",
    category: "e_waste",
    mandiCategory: "Fridge (Single Door)",
    mandiSubcategory: "Single Door(Cop)",
    fallbackRate: 52,
    unit: "kg",
    icon: "🧊",
    confidence: 90,
    shortDescription: "Single & double door domestic refrigerators with copper tubing and compressor.",
    safetyWarning: "Do not puncture refrigerant coils. CFC gas must be safely captured."
  },
  {
    id: "mat_ac",
    name: "Air Conditioner (Split / Window)",
    hindiName: "एसी स्क्रैप (विंडो / स्प्लिट)",
    marathiName: "एसी स्क्रॅप",
    category: "e_waste",
    mandiCategory: "AC Window",
    mandiSubcategory: "1T-Cop",
    fallbackRate: 131,
    unit: "kg",
    icon: "❄️",
    confidence: 94,
    shortDescription: "AC copper radiator cooling coils, rotary compressor, and blower assembly.",
    safetyWarning: "Depressurize and evacuate refrigerant before dismantling."
  },
  {
    id: "mat_plastic",
    name: "Heavy Rigid Plastic (HDPE)",
    hindiName: "कठोर प्लास्टिक",
    marathiName: "कडक प्लास्टिक",
    category: "plastic",
    mandiCategory: "E-waste",
    mandiSubcategory: "E-waste without accessories",
    fallbackRate: 38,
    unit: "kg",
    icon: "🍾",
    confidence: 91,
    shortDescription: "Milk crates, drums, thick buckets, appliance casings, and rigid chairs.",
    safetyWarning: "Ensure plastic containers are completely washed and empty of chemicals."
  }
];

/**
 * Fetches raw live scrap rates from MetalMandi API
 */
export async function fetchMetalMandiRates(cityId = DEFAULT_CITY_ID) {
  const url = `https://www.metalmandi.in/api/crm-proxy?path=/pricing?cityId=${cityId}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    throw new Error(`MetalMandi API responded with status: ${response.status}`);
  }

  const json = await response.json();
  if (!json.success || !json.data?.dashboardMaterialPricing) {
    throw new Error(json.message || "Invalid MetalMandi API response structure");
  }

  return json.data.dashboardMaterialPricing;
}

/**
 * Processes MetalMandi live prices and updates master document & database
 */
export async function syncLiveScrapRates(cityId = DEFAULT_CITY_ID, cityName = DEFAULT_CITY_NAME) {
  let rawPricing = null;
  let isLive = true;

  try {
    rawPricing = await fetchMetalMandiRates(cityId);
  } catch (error) {
    console.warn(`[MetalMandi] Live fetch failed: ${error.message}. Using stored master rates.`);
    isLive = false;
  }

  // Build lookup index: Category -> Subcategory -> Price
  const lookup = new Map();
  if (rawPricing) {
    for (const cat of rawPricing) {
      const catKey = (cat.category_name || "").trim().toLowerCase();
      if (!lookup.has(catKey)) lookup.set(catKey, new Map());
      const subMap = lookup.get(catKey);

      for (const sub of cat.subcategories || []) {
        const subKey = (sub.subcategory_name || "").trim().toLowerCase();
        const pricePerKg = Number(
          sub.has_only_high_price_in_kgs ??
          sub.has_only_kgs_unit_high_price ??
          sub.has_only_high_price_in_pcs ??
          0
        );
        const lowPrice = Number(
          sub.has_only_kgs_unit_low_price ??
          (pricePerKg > 0 ? pricePerKg * 0.95 : 0)
        );
        const change = Number(sub.percentage_change ?? 0);

        if (pricePerKg > 0) {
          subMap.set(subKey, {
            pricePerKg,
            marketRangeMin: Math.round(lowPrice || pricePerKg * 0.95),
            marketRangeMax: Math.round(pricePerKg * 1.05),
            change
          });
        }
      }
    }
  }

  const now = new Date();

  // Map platform items to live MetalMandi prices
  const synchronizedItems = PLATFORM_ITEMS.map((item) => {
    let rate = item.fallbackRate;
    let minRate = Math.round(rate * 0.95);
    let maxRate = Math.round(rate * 1.05);
    let changeStr = "Stable";
    let trend = "stable";

    if (isLive) {
      const catKey = (item.mandiCategory || "").toLowerCase();
      const subKey = (item.mandiSubcategory || "").toLowerCase();
      const subMap = lookup.get(catKey);

      if (subMap) {
        let match = subMap.get(subKey);
        if (!match) {
          // Find closest matching subcategory in this category
          for (const [key, val] of subMap.entries()) {
            if (key.includes(subKey) || subKey.includes(key)) {
              match = val;
              break;
            }
          }
        }
        if (!match && subMap.size > 0) {
          match = Array.from(subMap.values())[0];
        }

        if (match && match.pricePerKg > 0) {
          rate = Math.round(match.pricePerKg);
          minRate = match.marketRangeMin;
          maxRate = match.marketRangeMax;
          if (match.change > 0) {
            trend = "up";
            changeStr = `+${match.change}% today`;
          } else if (match.change < 0) {
            trend = "down";
            changeStr = `${match.change}% today`;
          }
        }
      }
    }

    return {
      id: item.id,
      name: item.name,
      hindiName: item.hindiName,
      marathiName: item.marathiName,
      category: item.category,
      pricePerKg: rate,
      marketRangeMin: minRate,
      marketRangeMax: maxRate,
      unit: item.unit,
      trend,
      change: changeStr,
      icon: item.icon,
      confidence: item.confidence,
      shortDescription: item.shortDescription,
      safetyWarning: item.safetyWarning,
      mandiCategory: item.mandiCategory,
      mandiSubcategory: item.mandiSubcategory,
      source: isLive ? "MetalMandi Live API" : "MetalMandi Benchmark (Cached)",
      city: cityName,
      lastSyncedAt: now.toISOString()
    };
  });

  const masterDocument = {
    source: "MetalMandi (https://www.metalmandi.in/scrap-rate)",
    cityId,
    cityName,
    lastSyncedAt: now.toISOString(),
    itemCount: synchronizedItems.length,
    status: isLive ? "LIVE_SYNCHRONIZED" : "CACHED_FALLBACK",
    materials: synchronizedItems
  };

  // Save to master document JSON files
  try {
    const jsonString = JSON.stringify(masterDocument, null, 2);
    const backendDir = path.dirname(BACKEND_RATES_FILE);
    if (!fs.existsSync(backendDir)) fs.mkdirSync(backendDir, { recursive: true });
    fs.writeFileSync(BACKEND_RATES_FILE, jsonString, "utf-8");

    const frontendDir = path.dirname(FRONTEND_RATES_FILE);
    if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
    fs.writeFileSync(FRONTEND_RATES_FILE, jsonString, "utf-8");

    console.log(`[MetalMandi] Master scrap rates document saved successfully (${synchronizedItems.length} items).`);
  } catch (fsErr) {
    console.error("[MetalMandi] Error saving master document:", fsErr.message);
  }

  // Update MongoDB Price collection in parallel
  try {
    const bulkOps = synchronizedItems.map((item) => ({
      updateOne: {
        filter: { materialCategory: item.id, location: cityName },
        update: {
          $set: {
            materialCategory: item.id,
            location: cityName,
            buyingPrice: item.marketRangeMin,
            quotedPrice: item.pricePerKg,
            marketRangeMin: item.marketRangeMin,
            marketRangeMax: item.marketRangeMax,
            unit: item.unit,
            source: "MetalMandi Live Scrap Rate",
            confidence: "high",
            priceDate: now
          }
        },
        upsert: true
      }
    }));

    if (bulkOps.length > 0 && Price.db?.readyState === 1) {
      await Price.bulkWrite(bulkOps);
      console.log(`[MetalMandi] Updated ${bulkOps.length} records in MongoDB Price collection.`);
    }
  } catch (dbErr) {
    console.warn("[MetalMandi] MongoDB update skipped (using JSON file):", dbErr.message);
  }

  return masterDocument;
}

/**
 * Retrieves the current synchronized master document, refreshing if older than 30 minutes
 */
export async function getLiveScrapRates() {
  try {
    if (fs.existsSync(BACKEND_RATES_FILE)) {
      const raw = fs.readFileSync(BACKEND_RATES_FILE, "utf-8");
      const data = JSON.parse(raw);
      const ageMinutes = (Date.now() - new Date(data.lastSyncedAt).getTime()) / 60000;
      if (ageMinutes < 30) {
        return data;
      }
    }
  } catch {
    // If read fails, proceed to sync
  }

  return syncLiveScrapRates();
}
