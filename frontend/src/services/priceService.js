import { mockMaterials } from "../data/mockData";
import { formatDateLabel } from "../utils/helpers";
import { api } from "./api";

export const categoryFor = (material) => {
  const text = `${material.id} ${material.name}`.toLowerCase();
  if (text.includes("copper")) return "copper";
  if (text.includes("pcb")) return "PCB";
  if (text.includes("brass") || text.includes("pitul")) return "brass";
  if (text.includes("aluminium") || text.includes("aluminum")) return "aluminum";
  if (text.includes("steel")) return "steel";
  if (text.includes("motor") || text.includes("transformer")) return "motors";
  if (text.includes("cable")) return "cables";
  if (text.includes("crt")) return "CRT";
  if (text.includes("battery")) return "batteries";
  if (text.includes("television") || text.includes("lcd")) return "LCD";
  if (text.includes("plastic")) return "mixed_plastic";
  if (text.includes("aluminum")) return "aluminum";
  if (text.includes("brass")) return "brass";
  if (text.includes("steel")) return "steel";
  return "e_waste";
};

export const getPriceBoard = async () => {
  const { prices } = await api("/prices");
  const byCategory = new Map(prices.map((price) => [price.materialCategory, price]));
  return mockMaterials.map((material) => {
    const price = byCategory.get(categoryFor(material));
    return price ? {
      ...material,
      pricePerKg: price.quotedPrice,
      marketRangeMin: price.marketRangeMin,
      marketRangeMax: price.marketRangeMax,
      priceSource: price.source,
      priceConfidence: price.confidence,
      unit: price.unit,
      updatedAt: price.priceDate
    } : material;
  });
};
export const getPriceHistory = async (materialCategory, days = 30) => (await api(`/prices/${encodeURIComponent(materialCategory)}/trend?days=${days}`)).prices;
export const getCurrentMaterialPrice = async (material) => {
  const { prices } = await api("/prices");
  return prices.find((price) => price.materialCategory === categoryFor(material)) || null;
};
export const evaluateFairOffer = (offer, price) => {
  if (!price || !Number.isFinite(Number(offer))) return null;
  const minimum = Number(price.marketRangeMin ?? price.buyingPrice);
  const maximum = Number(price.marketRangeMax ?? price.quotedPrice);
  const value = Number(offer);
  const midpoint = (minimum + maximum) / 2;
  if (value < minimum) return { level: "below", difference: Math.round(((minimum - value) / minimum) * 100), message: `${Math.round(((minimum - value) / minimum) * 100)}% below the fair range` };
  if (value > maximum) return { level: "above", difference: Math.round(((value - maximum) / maximum) * 100), message: `${Math.round(((value - maximum) / maximum) * 100)}% above the fair range` };
  return { level: "fair", difference: Math.round(((value - midpoint) / midpoint) * 100), message: "Within today’s fair range" };
};
export { formatDateLabel };
