// ---------------------------------------------------------------------------
// TRANSACTION SERVICE — LOCAL-ONLY MODE
//
// The earnings ledger currently reads the sample transactions in
// src/data/mockData.js. Completing a sale does NOT append to it — there is no
// local transaction store yet, so the ledger is a static display rather than a
// running record. The Supabase queries that made it real are preserved in the
// `BACKEND (disabled)` blocks.
// ---------------------------------------------------------------------------

import { mockTransactions, mockUser } from "../data/mockData";

export const getCollectorTransactions = async () => {
  return mockTransactions;

  // BACKEND (disabled) ------------------------------------------------------
  // Fetch the collector's lots, then the transactions joined to those lots,
  // and map each into { date, materialName, weightKg, pricePerKg, totalAmount,
  // recyclerName, status }.
  //
  // const { data: lots } = await supabase.from("lots")
  //   .select("id, materials, total_weight, estimated_value")
  //   .eq("collector_id", collectorId);
  // const { data: transactions } = await supabase.from("transactions")
  //   .select("*, recyclers(name)")
  //   .in("lot_id", lots.map((l) => l.id))
  //   .order("created_at", { ascending: false });
  // -------------------------------------------------------------------------
};

export const getCollectorEarningsSummary = async () => {
  return {
    totalEarnings: mockUser.totalEarnings,
    todayEarnings: mockUser.todayEarnings,
    monthlyEarnings: mockUser.monthlyEarnings,
    completedDeals: mockUser.completedDeals
  };

  // BACKEND (disabled) ------------------------------------------------------
  // Sums final_price / quoted_price across the collector's transactions and
  // buckets them into today / this month / all time.
  // -------------------------------------------------------------------------
};

export const createTransaction = async ({
  lotId,
  recyclerId,
  quotedPrice,
  finalPrice,
  handoverRef
}) => {
  // BACKEND (disabled):
  // await supabase.from("transactions").insert({
  //   lot_id: lotId, recycler_id: recyclerId, quoted_price: quotedPrice,
  //   final_price: finalPrice, handover_ref: handoverRef, payment_status: "pending"
  // }).select().single();
  return {
    id: `local_tx_${Date.now()}`,
    lot_id: lotId,
    recycler_id: recyclerId,
    quoted_price: quotedPrice,
    final_price: finalPrice,
    handover_ref: handoverRef,
    payment_status: "pending",
    created_at: new Date().toISOString()
  };
};

export const confirmHandover = async (transactionId, finalPrice) => {
  // BACKEND (disabled):
  // await supabase.from("transactions")
  //   .update({ final_price: finalPrice, payment_status: "paid",
  //             updated_at: new Date().toISOString() })
  //   .eq("id", transactionId).select().single();
  return {
    id: transactionId,
    final_price: finalPrice,
    payment_status: "paid",
    updated_at: new Date().toISOString()
  };
};
