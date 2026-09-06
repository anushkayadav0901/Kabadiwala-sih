// Rule-based + statistical anomaly detection for transactions.
// Mirrors the IsolationForest approach with configurable thresholds.

import Price from "../models/Price.js";
import Transaction from "../models/Transaction.js";

const BASELINE_RATES = {
  copper: 425, cables: 400, PCB: 240, batteries: 95, LCD: 120,
  CRT: 80, motors: 190, e_waste: 120, mixed_plastic: 15,
  aluminum: 110, brass: 350, steel: 40, metal: 80
};

const THRESHOLDS = {
  priceLowRatio: 0.6,
  priceHighRatio: 1.5,
  weightMinKg: 0.1,
  weightMaxKg: 500,
  rapidCompletionMinutes: 5,
  duplicateWindowMinutes: 30,
  gpsMaxDriftKm: 50
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getSeverity = (flags) => {
  if (flags.length >= 3) return "high";
  if (flags.length === 2) return "medium";
  return "low";
};

export const detectAnomalies = async (transaction, lot) => {
  const flags = [];

  const category = transaction.materialCategory || lot?.materials?.[0]?.category;
  const weight = lot?.totalWeight || 0;
  const price = transaction.finalPrice ?? transaction.quotedPrice ?? 0;
  const unitPrice = weight > 0 ? price / weight : 0;

  // 1. Price anomaly: compare against recent market data or baseline
  if (category && unitPrice > 0) {
    let fairMin, fairMax;
    try {
      const recent = await Price.findOne({ materialCategory: category }).sort({ priceDate: -1 });
      if (recent) {
        fairMin = recent.marketRangeMin ?? recent.buyingPrice;
        fairMax = recent.marketRangeMax ?? recent.quotedPrice;
      }
    } catch (_) { /* use baseline */ }
    if (!fairMin) {
      const base = BASELINE_RATES[category] || 100;
      fairMin = base * 0.7;
      fairMax = base * 1.3;
    }
    if (unitPrice < fairMin * THRESHOLDS.priceLowRatio) {
      flags.push({ type: "price_below", severity: "high", reason: `Unit price ₹${Math.round(unitPrice)}/kg is ${Math.round(((fairMin - unitPrice) / fairMin) * 100)}% below fair minimum ₹${Math.round(fairMin)}/kg` });
    } else if (unitPrice > fairMax * THRESHOLDS.priceHighRatio) {
      flags.push({ type: "price_above", severity: "medium", reason: `Unit price ₹${Math.round(unitPrice)}/kg is ${Math.round(((unitPrice - fairMax) / fairMax) * 100)}% above fair maximum ₹${Math.round(fairMax)}/kg` });
    }
  }

  // 2. Weight anomaly
  if (weight < THRESHOLDS.weightMinKg) {
    flags.push({ type: "weight_low", severity: "medium", reason: `Weight ${weight} kg is suspiciously low` });
  } else if (weight > THRESHOLDS.weightMaxKg) {
    flags.push({ type: "weight_high", severity: "medium", reason: `Weight ${weight} kg is unusually high for a single lot` });
  }

  // 3. Rapid completion
  if (lot?.createdAt && transaction.completedAt) {
    const minutes = (new Date(transaction.completedAt) - new Date(lot.createdAt)) / 60000;
    if (minutes < THRESHOLDS.rapidCompletionMinutes) {
      flags.push({ type: "rapid_completion", severity: "medium", reason: `Transaction completed in ${Math.round(minutes)} minutes — unusually fast` });
    }
  }

  // 4. GPS mismatch between collection and handover
  if (lot?.gpsLat && transaction.handoverGps?.lat) {
    const drift = haversineKm(lot.gpsLat, lot.gpsLng, transaction.handoverGps.lat, transaction.handoverGps.lng);
    if (drift > THRESHOLDS.gpsMaxDriftKm) {
      flags.push({ type: "gps_mismatch", severity: "high", reason: `Collection and handover locations are ${Math.round(drift)} km apart` });
    }
  }

  // 5. Duplicate handover reference in short window
  if (transaction.handoverReference) {
    const duplicate = await Transaction.findOne({
      _id: { $ne: transaction._id },
      handoverReference: transaction.handoverReference,
      createdAt: { $gte: new Date(Date.now() - THRESHOLDS.duplicateWindowMinutes * 60000) }
    });
    if (duplicate) {
      flags.push({ type: "duplicate_ref", severity: "high", reason: "Duplicate handover reference detected within the last 30 minutes" });
    }
  }

  // 6. Repeated collector–recycler pair in short window (possible collusion)
  if (transaction.collector && transaction.recycler) {
    const recentCount = await Transaction.countDocuments({
      collector: transaction.collector,
      recycler: transaction.recycler,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60000) },
      _id: { $ne: transaction._id }
    });
    if (recentCount >= 5) {
      flags.push({ type: "frequent_pair", severity: "medium", reason: `${recentCount + 1} transactions between the same collector and recycler in 24 hours` });
    }
  }

  return {
    isAnomalous: flags.length > 0,
    severity: flags.length > 0 ? getSeverity(flags) : null,
    flags,
    checkedAt: new Date()
  };
};
