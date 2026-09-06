// ---------------------------------------------------------------------------
// PRICE SERVICE — LOCAL-ONLY MODE
//
// Prices come from the static catalogue in src/data/mockData.js. The historical
// price series and per-location lookups need a backend; those calls are
// preserved in `BACKEND (disabled)` blocks.
// ---------------------------------------------------------------------------

import { mockMaterials } from "../data/mockData";
import { formatDateLabel } from "../utils/helpers";

export const getPriceBoard = async () => {
  return [...mockMaterials];

  // BACKEND (disabled) ------------------------------------------------------
  // Reads the `prices` table for the collector's location, keeps the newest row
  // per material_category, and overrides pricePerKg on the catalogue entries.
  //
  // const { data: prices, error } = await supabase
  //   .from("prices")
  //   .select("*")
  //   .eq("location", location)
  //   .order("price_date", { ascending: false });
  // if (error || !prices?.length) return [...mockMaterials];
  // ... map latest price per category onto mockMaterials ...
  // -------------------------------------------------------------------------
};

export const getPriceHistory = async () => {
  // BACKEND (disabled): the 30-day trend series that the price board should
  // chart. Returns an empty series until a backend supplies it.
  //
  // await supabase.from("prices")
  //   .select("price_date, quoted_price, buying_price")
  //   .eq("material_category", materialCategory)
  //   .order("price_date", { ascending: true })
  //   .limit(days);
  return [];
};

export { formatDateLabel };
