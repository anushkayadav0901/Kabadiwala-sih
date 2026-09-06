// ---------------------------------------------------------------------------
// RECYCLER SERVICE — LOCAL-ONLY MODE
//
// Recyclers come from the static list in src/data/mockData.js. The distance
// values on those records are pre-baked, so the list does not yet re-rank
// against the collector's real GPS position.
//
// The Supabase implementation — including the matching score that weighted
// distance, offered rate, pickup availability and authorization status — is
// preserved in the `BACKEND (disabled)` block at the bottom of this file.
// ---------------------------------------------------------------------------

import { mockRecyclers } from "../data/mockData";
import { mapDbCategoryToFrontend, MATERIAL_ICONS } from "../utils/helpers";

export const getNearbyRecyclers = async (location = null, categoryFilter = "all") => {
  let list = [...mockRecyclers];

  if (categoryFilter && categoryFilter !== "all") {
    list = list.filter((r) => r.acceptedCategories.includes(categoryFilter));
  }

  return list.sort((a, b) => a.distanceKm - b.distanceKm);
};

export const getRecyclerDetails = async (id) => {
  const recycler = mockRecyclers.find((r) => r.id === id);
  if (!recycler) throw new Error("Recycler not found");
  return recycler;
};

export const getAllRecyclers = async () => [...mockRecyclers];

// BACKEND (disabled) --------------------------------------------------------
// const CATEGORY_ALIASES = {
//   metal: ["metal", "cables"],
//   e_waste: ["e_waste", "PCB", "LCD", "CRT"],
//   plastic: ["plastic", "mixed_plastic"],
//   paper: ["paper"],
//   hazardous: ["hazardous", "batteries", "motors"]
// };
//
// mapRecyclerRow(row, userLat, userLng)
//   Maps a `recyclers` row to the shape the UI expects and computes live
//   distance with haversineKm(). NOTE: the old version filled `rating` and
//   `reviewsCount` with Math.random() — do not carry that over; read real
//   review aggregates instead.
//
// scoreRecycler(recycler, materialCategory)
//   distance * 0.4 + rate * 0.35 + pickupAvailable * 0.15 + authorized * 0.1
//   This is the PS's "matching logic based on location, material category,
//   offered rate, pickup availability and authorization status".
//
// getNearbyRecyclers: SELECT * FROM recyclers -> map -> filter by category ->
//   sort by scoreRecycler (or distance when no material is selected) -> top 10.
// getRecyclerDetails: SELECT * FROM recyclers WHERE id = ?
// createRecycler / updateRecycler: INSERT / UPDATE on `recyclers`.
// ---------------------------------------------------------------------------

export { MATERIAL_ICONS, mapDbCategoryToFrontend };
