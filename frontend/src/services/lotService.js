// ---------------------------------------------------------------------------
// LOT SERVICE — LOCAL-ONLY MODE
//
// A "lot" is a batch of collected scrap. With no backend connected, createLot
// returns an in-memory lot object that the handover / payment / certificate
// screens consume. Nothing is persisted between reloads yet — the offline
// queue (IndexedDB) that would do that has not been built.
//
// The Supabase implementation is preserved in `BACKEND (disabled)` blocks.
// ---------------------------------------------------------------------------

export const createLot = async ({
  collectorId,
  materials,
  totalWeight,
  estimatedValue,
  photoUrls = [],
  gpsLat,
  gpsLng,
  status = "created"
}) => {
  return {
    id: `local_${Date.now()}`,
    collector_id: collectorId,
    materials: Array.isArray(materials) ? materials : [],
    total_weight: totalWeight,
    estimated_value: estimatedValue,
    photo_urls: photoUrls,
    gps_lat: gpsLat,
    gps_lng: gpsLng,
    status,
    created_at: new Date().toISOString()
  };

  // BACKEND (disabled) ------------------------------------------------------
  // Inserts a row into `materials`, then `lots`, then a `traceability` record
  // holding photos + weight + GPS + handover reference number.
  //
  // const materialRow = materialData ? await createMaterialRecord(materialData) : null;
  // const { data, error } = await supabase
  //   .from("lots")
  //   .insert({
  //     collector_id: collectorId,
  //     materials: normalizedMaterials,
  //     total_weight: totalWeight,
  //     estimated_value: estimatedValue,
  //     photo_urls: photoUrls,
  //     gps_lat: gpsLat,
  //     gps_lng: gpsLng,
  //     status
  //   })
  //   .select()
  //   .single();
  // if (error) throw new Error(error.message);
  // if (traceability) await createTraceabilityRecord({ lotId: data.id, ... });
  // return data;
  // -------------------------------------------------------------------------
};

export const updateLotStatus = async (lotId, status) => {
  // BACKEND (disabled):
  // await supabase.from("lots").update({ status }).eq("id", lotId).select().single();
  return { id: lotId, status };
};

export const getCollectorLots = async () => {
  // BACKEND (disabled):
  // await supabase.from("lots").select("*").eq("collector_id", collectorId)
  //   .order("created_at", { ascending: false });
  return [];
};

export const getOpenLots = async () => {
  // BACKEND (disabled):
  // await supabase.from("lots").select("*, collectors(name, phone)")
  //   .in("status", ["created", "matched"]).order("created_at", { ascending: false });
  return [];
};

export const subscribeToLotUpdates = () => {
  // BACKEND (disabled): Supabase Realtime channel on postgres_changes for `lots`.
  // Returns an unsubscribe function so callers can use it in useEffect cleanup.
  return () => {};
};

export const createTraceabilityRecord = async (record) => {
  // BACKEND (disabled):
  // await supabase.from("traceability").insert({
  //   lot_id, photo_urls, weight, gps_lat, gps_lng,
  //   handover_reference_number, status, recycler_confirmed: false
  // });
  return record;
};

export const updateTraceabilityStatus = async (lotId, status) => {
  // BACKEND (disabled):
  // await supabase.from("traceability")
  //   .update({ status, recycler_confirmed: status === "paid" }).eq("lot_id", lotId);
  return { lot_id: lotId, status };
};
