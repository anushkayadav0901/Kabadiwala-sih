import { mockMaterials } from "../data/mockData";
import { formatDateLabel } from "../utils/helpers";
import { api } from "./api";
import { cacheData, getCachedData } from "../utils/offlineStore";
import initialLiveRates from "../data/liveScrapRates.json";

const PRICE_CACHE_KEY = "prices_master";
const PRICE_TTL = 3600000;

let cachedMasterDoc = initialLiveRates;

export const categoryFor = (material) => {
  if (!material) return "e_waste";
  if (material.category && material.category !== "all") return material.category;
  const text = `${material.id || ""} ${material.name || ""}`.toLowerCase();
  if (text.includes("copper")) return "copper";
  if (text.includes("pcb")) return "PCB";
  if (text.includes("brass") || text.includes("pitul")) return "brass";
  if (text.includes("aluminium") || text.includes("aluminum")) return "aluminum";
  if (text.includes("steel")) return "steel";
  if (text.includes("iron")) return "iron";
  if (text.includes("motor") || text.includes("transformer")) return "motors";
  if (text.includes("cable")) return "cables";
  if (text.includes("crt")) return "CRT";
  if (text.includes("battery")) return "batteries";
  if (text.includes("television") || text.includes("lcd")) return "LCD";
  if (text.includes("plastic")) return "mixed_plastic";
  return "e_waste";
};

/**
 * Returns the current live master scrap rates document.
 * Queries /api/prices/live, falling back cleanly to the master JSON file.
 */
export const getLiveMasterDoc = async () => {
  try {
    const data = await api("/prices/live");
    if (data && data.materials && data.materials.length > 0) {
      cachedMasterDoc = data;
      cacheData(PRICE_CACHE_KEY, data, PRICE_TTL).catch(() => {});
      return data;
    }
  } catch {
    const offline = await getCachedData(PRICE_CACHE_KEY);
    if (offline) { cachedMasterDoc = offline; return offline; }
  }
  return cachedMasterDoc;
};

/**
 * Triggers an instant live scrap rate synchronization from MetalMandi API
 */
export const syncMetalMandiRates = async (cityId = 113, cityName = "Central Delhi, Delhi NCR") => {
  try {
    const res = await api("/prices/sync", {
      method: "POST",
      body: { cityId, cityName }
    });
    if (res?.data && res.data.materials) {
      cachedMasterDoc = res.data;
      return res.data;
    }
  } catch (err) {
    console.warn("[priceService] Backend sync failed, keeping current master rates:", err.message);
  }
  return cachedMasterDoc;
};

/**
 * Returns all platform materials with real-time MetalMandi prices
 */
export const getPriceBoard = async () => {
  const masterDoc = await getLiveMasterDoc();
  if (masterDoc?.materials && masterDoc.materials.length > 0) {
    return masterDoc.materials;
  }
  return mockMaterials;
};

export const getPriceHistory = async (materialCategory, days = 30) => {
  try {
    const res = await api(`/prices/${encodeURIComponent(materialCategory)}/trend?days=${days}`);
    return res.prices || [];
  } catch {
    return [];
  }
};

export const getCurrentMaterialPrice = async (material) => {
  if (!material) return null;
  const masterDoc = await getLiveMasterDoc();
  const matId = material.id;
  const matName = (material.name || "").toLowerCase();
  
  const found = masterDoc?.materials?.find(
    (m) => m.id === matId || (m.name && m.name.toLowerCase() === matName)
  );

  if (found) {
    return {
      materialCategory: found.id,
      quotedPrice: found.pricePerKg,
      marketRangeMin: found.marketRangeMin,
      marketRangeMax: found.marketRangeMax,
      unit: found.unit,
      source: found.source,
      confidence: found.confidence
    };
  }

  return {
    materialCategory: material.id || "mat_generic",
    quotedPrice: material.pricePerKg || 100,
    marketRangeMin: material.marketRangeMin || 90,
    marketRangeMax: material.marketRangeMax || 110,
    unit: material.unit || "kg",
    source: "Standard Market Benchmark",
    confidence: "medium"
  };
};

export const evaluateFairOffer = (offer, price) => {
  if (!price || !Number.isFinite(Number(offer))) return null;
  const minimum = Number(price.marketRangeMin ?? price.buyingPrice ?? 0);
  const maximum = Number(price.marketRangeMax ?? price.quotedPrice ?? 0);
  const value = Number(offer);
  const midpoint = (minimum + maximum) / 2;
  if (value < minimum) return { level: "below", difference: Math.round(((minimum - value) / minimum) * 100), message: `${Math.round(((minimum - value) / minimum) * 100)}% below the fair range` };
  if (value > maximum) return { level: "above", difference: Math.round(((value - maximum) / maximum) * 100), message: `${Math.round(((value - maximum) / maximum) * 100)}% above the fair range` };
  return { level: "fair", difference: Math.round(((value - midpoint) / midpoint) * 100), message: "Within today’s fair range" };
};

export { formatDateLabel };
