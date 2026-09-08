import { api } from "./api";

export const scanAnomalies = async (days = 30) => api(`/anomalies/scan?days=${days}`, { auth: true });
export const checkLotAnomaly = async (lotId) => api(`/anomalies/check-lot/${lotId}`, { auth: true });
export const getTransactionAnomaly = async (txId) => api(`/transactions/${txId}/anomaly`, { auth: true });

const FLAG_META = {
  price_below: { label: "Underpriced", icon: "📉", color: "red" },
  price_above: { label: "Overpriced", icon: "📈", color: "amber" },
  weight_low:  { label: "Low weight", icon: "⚖️", color: "amber" },
  weight_high: { label: "Heavy lot", icon: "⚖️", color: "amber" },
  rapid_completion: { label: "Speed flag", icon: "⚡", color: "amber" },
  gps_mismatch: { label: "Location drift", icon: "📍", color: "red" },
  duplicate_ref: { label: "Duplicate", icon: "🔁", color: "red" },
  frequent_pair: { label: "Repeat pair", icon: "🤝", color: "amber" },
};

export const getFlagMeta = (type) => FLAG_META[type] || { label: type, icon: "⚠️", color: "amber" };

export const DEMO_ANOMALIES = {
  summary: { scanned: 34, flagged: 4, high: 1, medium: 2, low: 1 },
  anomalies: [
    {
      transactionId: "demo_t1",
      materialCategory: "copper",
      totalWeight: 2.5,
      quotedPrice: 8500,
      createdAt: "2026-09-07T14:30:00Z",
      severity: "high",
      flags: [
        { type: "price_above", severity: "high", reason: "Unit price ₹3,400/kg is 180% above fair maximum ₹600/kg" },
        { type: "rapid_completion", severity: "medium", reason: "Transaction completed in 2 minutes — unusually fast" },
      ],
    },
    {
      transactionId: "demo_t2",
      materialCategory: "PCB",
      totalWeight: 0.05,
      quotedPrice: 12,
      createdAt: "2026-09-06T09:15:00Z",
      severity: "medium",
      flags: [
        { type: "weight_low", severity: "medium", reason: "Weight 0.05 kg is suspiciously low" },
      ],
    },
    {
      transactionId: "demo_t3",
      materialCategory: "batteries",
      totalWeight: 15,
      quotedPrice: 4500,
      createdAt: "2026-09-05T16:45:00Z",
      severity: "medium",
      flags: [
        { type: "frequent_pair", severity: "medium", reason: "6 transactions between the same collector and recycler in 24 hours" },
      ],
    },
    {
      transactionId: "demo_t4",
      materialCategory: "LCD",
      totalWeight: 30,
      quotedPrice: 900,
      createdAt: "2026-09-04T11:00:00Z",
      severity: "low",
      flags: [
        { type: "price_below", severity: "low", reason: "Unit price ₹30/kg is 40% below fair minimum ₹50/kg" },
      ],
    },
  ],
};
