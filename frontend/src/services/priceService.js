import { mockMaterials } from "../data/mockData";
import { formatDateLabel } from "../utils/helpers";
import { api } from "./api";

const categoryFor = (material) => {
  const text = `${material.id} ${material.name}`.toLowerCase();
  if (text.includes("copper")) return "copper";
  if (text.includes("pcb")) return "PCB";
  if (text.includes("battery")) return "batteries";
  if (text.includes("television") || text.includes("lcd")) return "LCD";
  if (text.includes("plastic")) return "mixed_plastic";
  if (text.includes("aluminum")) return "aluminum";
  if (text.includes("brass")) return "brass";
  if (text.includes("steel")) return "steel";
  return null;
};

export const getPriceBoard = async () => {
  const { prices } = await api("/prices");
  const byCategory = new Map(prices.map((price) => [price.materialCategory, price]));
  return mockMaterials.map((material) => {
    const price = byCategory.get(categoryFor(material));
    return price ? { ...material, pricePerKg: price.quotedPrice, unit: price.unit, updatedAt: price.priceDate } : material;
  });
};
export const getPriceHistory = async (materialCategory, days = 30) => (await api(`/prices/${encodeURIComponent(materialCategory)}/trend?days=${days}`)).prices;
export { formatDateLabel };
