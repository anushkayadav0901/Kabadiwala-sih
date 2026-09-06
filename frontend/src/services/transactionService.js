import { api } from "./api";

export const getCollectorTransactions = async (collectorId) => (await api(`/collector/${collectorId}/ledger`, { auth: true })).transactions;
export const getCollectorEarningsSummary = async (collectorId) => (await api(`/collector/${collectorId}/ledger`, { auth: true })).summary;
export const createTransaction = async ({ lotId, recyclerId, quotedPrice, finalPrice, handoverRef, paymentMethod = "pending" }) => {
  const { transaction } = await api(`/lots/${lotId}/handover`, { method: "POST", body: { recyclerId, quotedPrice, finalPrice, handoverRef, paymentMethod }, auth: true });
  return { id: transaction._id, lot_id: lotId, recycler_id: recyclerId, quoted_price: transaction.quotedPrice, final_price: transaction.finalPrice, handover_ref: transaction.handoverReference, payment_status: transaction.paymentStatus, created_at: transaction.createdAt };
};
export const confirmHandover = async (lotId, finalPrice, recyclerId) => {
  const { transaction } = await api(`/lots/${lotId}/handover`, { method: "POST", body: { finalPrice, recyclerId }, auth: true });
  return { id: transaction._id, final_price: transaction.finalPrice, payment_status: transaction.paymentStatus, updated_at: transaction.updatedAt };
};
