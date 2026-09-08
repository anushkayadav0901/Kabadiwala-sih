import { haversineKm, mapDbCategoryToFrontend, MATERIAL_ICONS } from "../utils/helpers";
import { api } from "./api";
import { cacheData, getCachedData } from "../utils/offlineStore";

const RECYCLER_CACHE_KEY = "recyclers_all";
const RECYCLER_TTL = 3600000;

const normalizeRecycler = (recycler, location) => ({
  ...recycler,
  acceptedCategories: recycler.acceptedCategories || [],
  verified: recycler.verified ?? recycler.authorized,
  pickupAvailable: Boolean(recycler.pickupAvailable),
  distanceKm: recycler.distanceKm ?? (location ? haversineKm(location.lat, location.lng, recycler.lat, recycler.lng) : null)
});
export const getNearbyRecyclers = async (location = null, categoryFilter = "all", weight = null, lotId = null, eprProducer = null) => {
  const params = new URLSearchParams();
  if (categoryFilter !== "all") params.set("material", categoryFilter);
  if (weight != null) params.set("weight", weight);
  if (lotId) params.set("lotId", lotId);
  if (eprProducer) params.set("eprProducer", eprProducer);
  if (location?.lat != null && location?.lng != null) { params.set("lat", location.lat); params.set("lng", location.lng); }
  try {
    const { recyclers } = await api(`/recyclers${params.size ? `?${params}` : ""}`);
    const result = recyclers.map((recycler) => normalizeRecycler(recycler, location)).sort((a, b) =>
      (Number.isFinite(b.matchScore) ? b.matchScore - (a.matchScore || 0) : 0) ||
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    );
    cacheData(RECYCLER_CACHE_KEY, result, RECYCLER_TTL).catch(() => {});
    return result;
  } catch {
    const cached = await getCachedData(RECYCLER_CACHE_KEY);
    if (cached) return cached;
    return [];
  }
};
export const getAllRecyclers = async () => {
  try {
    const result = (await api("/recyclers")).recyclers.map((recycler) => normalizeRecycler(recycler));
    cacheData(RECYCLER_CACHE_KEY, result, RECYCLER_TTL).catch(() => {});
    return result;
  } catch {
    const cached = await getCachedData(RECYCLER_CACHE_KEY);
    return cached || [];
  }
};
export const getRecyclerDetails = async (id) => {
  const recycler = (await getAllRecyclers()).find((item) => item.id === id);
  if (!recycler) throw new Error("Recycler not found");
  return recycler;
};
export { MATERIAL_ICONS, mapDbCategoryToFrontend };
