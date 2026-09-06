import { haversineKm, mapDbCategoryToFrontend, MATERIAL_ICONS } from "../utils/helpers";
import { api } from "./api";

const normalizeRecycler = (recycler, location) => ({
  ...recycler,
  acceptedCategories: recycler.acceptedCategories || [],
  verified: recycler.verified ?? recycler.authorized,
  pickupAvailable: Boolean(recycler.pickupAvailable),
  distanceKm: recycler.distanceKm ?? (location ? haversineKm(location.lat, location.lng, recycler.lat, recycler.lng) : null)
});
export const getNearbyRecyclers = async (location = null, categoryFilter = "all", weight = null) => {
  const params = new URLSearchParams();
  if (categoryFilter !== "all") params.set("material", categoryFilter);
  if (weight != null) params.set("weight", weight);
  if (location?.lat != null && location?.lng != null) { params.set("lat", location.lat); params.set("lng", location.lng); }
  const { recyclers } = await api(`/recyclers${params.size ? `?${params}` : ""}`);
  return recyclers.map((recycler) => normalizeRecycler(recycler, location)).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
};
export const getAllRecyclers = async () => (await api("/recyclers")).recyclers.map((recycler) => normalizeRecycler(recycler));
export const getRecyclerDetails = async (id) => {
  const recycler = (await getAllRecyclers()).find((item) => item.id === id);
  if (!recycler) throw new Error("Recycler not found");
  return recycler;
};
export { MATERIAL_ICONS, mapDbCategoryToFrontend };
