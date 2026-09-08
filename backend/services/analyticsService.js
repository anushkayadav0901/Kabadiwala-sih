// ---------------------------------------------------------------------------
// ANALYTICS + REGULATORY REPORTING
//
// Two consumers:
//   1. computeCollectorAnalytics — per-collector trends for the in-app dashboard
//   2. computeCpcbReport         — aggregate channeling report for CPCB / SPCB
//
// Aggregation runs in JS rather than Mongo pipelines: every figure here needs
// the joined Lot document (weight, materials, GPS), so the populate() path is
// both clearer and, at this scale, no slower.
// ---------------------------------------------------------------------------
import Transaction from "../models/Transaction.js";
import Collector from "../models/Collector.js";
import Recycler from "../models/Recycler.js";

const DAY_MS = 86400000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// PS 26229 names these seven material streams. Anything the classifier emits
// outside this list is folded into "other" so the report totals stay closed.
export const PS_CATEGORIES = {
  CRT: "CRT Glass & Displays",
  LCD: "LCD / LED Panels",
  PCB: "Printed Circuit Boards",
  cables: "Cables & Wiring",
  batteries: "Batteries",
  motors: "Motors & Magnet Assemblies",
  mixed_plastic: "Mixed Plastics",
};

const CATEGORY_ALIASES = {
  crt: "CRT", television: "LCD", lcd: "LCD", led: "LCD",
  pcb: "PCB", mobile: "PCB", player: "PCB",
  cables: "cables", copper: "cables", wire: "cables", metal: "cables",
  batteries: "batteries", battery: "batteries",
  motors: "motors", "washing machine": "motors", microwave: "motors",
  mixed_plastic: "mixed_plastic", plastic: "mixed_plastic",
  keyboard: "mixed_plastic", mouse: "mixed_plastic", printer: "mixed_plastic",
};

export const normalizeCategory = (raw) => {
  if (!raw) return "other";
  const key = String(raw).toLowerCase().trim();
  return CATEGORY_ALIASES[key] || (PS_CATEGORIES[raw] ? raw : "other");
};

const amountOf = (tx) => Number(tx.finalPrice ?? tx.quotedPrice ?? 0);
const weightOf = (tx) => Number(tx.finalWeight ?? tx.lot?.totalWeight ?? 0);
const round = (n, dp = 2) => Number(Number(n || 0).toFixed(dp));
const pct = (part, total) => (total > 0 ? round((part / total) * 100, 1) : 0);

const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// 1. COLLECTOR ANALYTICS
// ---------------------------------------------------------------------------
export const computeCollectorAnalytics = async (collectorId, days = 30) => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS);
  const priorStart = new Date(now.getTime() - days * 2 * DAY_MS);

  const transactions = await Transaction.find({
    collector: collectorId,
    createdAt: { $gte: priorStart },
  })
    .populate("lot")
    .populate("recycler", "name")
    .sort({ createdAt: 1 });

  const inWindow = transactions.filter((tx) => tx.createdAt >= windowStart);
  const inPrior = transactions.filter((tx) => tx.createdAt < windowStart);

  const totals = (list) => ({
    earnings: round(list.reduce((s, tx) => s + amountOf(tx), 0)),
    weight: round(list.reduce((s, tx) => s + weightOf(tx), 0)),
    trips: list.length,
  });

  const current = totals(inWindow);
  const previous = totals(inPrior);

  const delta = (a, b) => (b > 0 ? round(((a - b) / b) * 100, 1) : a > 0 ? 100 : 0);

  // --- daily series (zero-filled so the chart has no gaps) ---
  const byDay = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    byDay.set(dateKey(new Date(now.getTime() - i * DAY_MS)), { earnings: 0, weight: 0, trips: 0 });
  }
  inWindow.forEach((tx) => {
    const bucket = byDay.get(dateKey(tx.createdAt));
    if (!bucket) return;
    bucket.earnings += amountOf(tx);
    bucket.weight += weightOf(tx);
    bucket.trips += 1;
  });
  const dailySeries = [...byDay.entries()].map(([date, v]) => ({
    date,
    earnings: round(v.earnings),
    weight: round(v.weight),
    trips: v.trips,
  }));

  // --- weekly rollup ---
  const weeklySeries = [];
  for (let i = 0; i < dailySeries.length; i += 7) {
    const chunk = dailySeries.slice(i, i + 7);
    weeklySeries.push({
      label: `W${weeklySeries.length + 1}`,
      startDate: chunk[0]?.date,
      endDate: chunk[chunk.length - 1]?.date,
      earnings: round(chunk.reduce((s, d) => s + d.earnings, 0)),
      weight: round(chunk.reduce((s, d) => s + d.weight, 0)),
      trips: chunk.reduce((s, d) => s + d.trips, 0),
    });
  }

  // --- material mix (weight + earnings share per PS category) ---
  const mixMap = new Map();
  inWindow.forEach((tx) => {
    const materials = tx.lot?.materials?.length
      ? tx.lot.materials
      : [{ category: tx.materialCategory, weightKg: weightOf(tx) }];
    const lotWeight = materials.reduce((s, m) => s + Number(m.weightKg || 0), 0) || weightOf(tx) || 1;
    materials.forEach((m) => {
      const cat = normalizeCategory(m.category || tx.materialCategory);
      const w = Number(m.weightKg || 0) || weightOf(tx);
      // Split the transaction value across its materials by weight share.
      const share = (w / lotWeight) * amountOf(tx);
      const entry = mixMap.get(cat) || { category: cat, weight: 0, earnings: 0, trips: 0 };
      entry.weight += w;
      entry.earnings += share;
      entry.trips += 1;
      mixMap.set(cat, entry);
    });
  });

  const totalMixWeight = [...mixMap.values()].reduce((s, m) => s + m.weight, 0);
  const totalMixEarnings = [...mixMap.values()].reduce((s, m) => s + m.earnings, 0);

  const materialMix = [...mixMap.values()]
    .map((m) => ({
      category: m.category,
      label: PS_CATEGORIES[m.category] || "Other Materials",
      weight: round(m.weight),
      earnings: round(m.earnings),
      trips: m.trips,
      weightShare: pct(m.weight, totalMixWeight),
      earningsShare: pct(m.earnings, totalMixEarnings),
      ratePerKg: m.weight > 0 ? round(m.earnings / m.weight) : 0,
    }))
    .sort((a, b) => b.earnings - a.earnings);

  // --- day-of-week activity pattern ---
  const dowBuckets = DAY_NAMES.map((name) => ({ day: name, earnings: 0, weight: 0, trips: 0 }));
  inWindow.forEach((tx) => {
    const b = dowBuckets[new Date(tx.createdAt).getDay()];
    b.earnings += amountOf(tx);
    b.weight += weightOf(tx);
    b.trips += 1;
  });
  const dayPattern = dowBuckets.map((b) => ({ ...b, earnings: round(b.earnings), weight: round(b.weight) }));
  const bestDay = [...dayPattern].sort((a, b) => b.earnings - a.earnings)[0];

  // --- recycler concentration (who this collector actually sells to) ---
  const recyclerMap = new Map();
  inWindow.forEach((tx) => {
    const name = tx.recycler?.name || "Unrecorded recycler";
    const entry = recyclerMap.get(name) || { name, earnings: 0, trips: 0 };
    entry.earnings += amountOf(tx);
    entry.trips += 1;
    recyclerMap.set(name, entry);
  });
  const topRecyclers = [...recyclerMap.values()]
    .map((r) => ({ ...r, earnings: round(r.earnings), share: pct(r.earnings, current.earnings) }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 4);

  // --- activity streak (consecutive days with at least one trip, ending today) ---
  let streak = 0;
  for (let i = dailySeries.length - 1; i >= 0; i -= 1) {
    if (dailySeries[i].trips > 0) streak += 1;
    else if (i < dailySeries.length - 1) break;
  }
  const activeDays = dailySeries.filter((d) => d.trips > 0).length;

  return {
    period: { days, from: windowStart, to: now },
    summary: {
      ...current,
      avgPerTrip: current.trips > 0 ? round(current.earnings / current.trips) : 0,
      avgRatePerKg: current.weight > 0 ? round(current.earnings / current.weight) : 0,
      activeDays,
      streak,
      bestDay: bestDay?.trips > 0 ? bestDay.day : null,
    },
    comparison: {
      earnings: delta(current.earnings, previous.earnings),
      weight: delta(current.weight, previous.weight),
      trips: delta(current.trips, previous.trips),
      previous,
    },
    dailySeries,
    weeklySeries,
    materialMix,
    dayPattern,
    topRecyclers,
  };
};

// ---------------------------------------------------------------------------
// 2. CPCB / SPCB REGULATORY REPORT
//
// Aggregates the formal-channeling picture the E-Waste (Management) Rules 2022
// require producers and state boards to evidence: how much material entered the
// authorized stream, in which categories, from which regions, and how much of
// it carries a complete traceability record.
// ---------------------------------------------------------------------------
export const computeCpcbReport = async ({ from, to, region } = {}) => {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 90 * DAY_MS);

  const query = { createdAt: { $gte: fromDate, $lte: toDate } };
  const transactions = await Transaction.find(query)
    .populate("lot")
    .populate("recycler", "name authorized cpcbRegistrationNumber address")
    .populate("collector", "name operatingLocation locationLat locationLng")
    .sort({ createdAt: -1 });

  const scoped = region && region !== "all"
    ? transactions.filter((tx) => {
        const loc = tx.collectionLocation || tx.collector?.operatingLocation || "";
        return loc.toLowerCase().includes(region.toLowerCase());
      })
    : transactions;

  const totalWeight = round(scoped.reduce((s, tx) => s + weightOf(tx), 0));
  const totalValue = round(scoped.reduce((s, tx) => s + amountOf(tx), 0));

  // --- category-wise channeling (all seven PS streams always present) ---
  const catMap = new Map(
    Object.keys(PS_CATEGORIES).map((k) => [k, { category: k, label: PS_CATEGORIES[k], weight: 0, value: 0, consignments: 0 }])
  );
  catMap.set("other", { category: "other", label: "Other / Unclassified", weight: 0, value: 0, consignments: 0 });

  scoped.forEach((tx) => {
    const materials = tx.lot?.materials?.length
      ? tx.lot.materials
      : [{ category: tx.materialCategory, weightKg: weightOf(tx) }];
    const lotWeight = materials.reduce((s, m) => s + Number(m.weightKg || 0), 0) || weightOf(tx) || 1;
    materials.forEach((m) => {
      const cat = normalizeCategory(m.category || tx.materialCategory);
      const entry = catMap.get(cat) || catMap.get("other");
      const w = Number(m.weightKg || 0) || weightOf(tx);
      entry.weight += w;
      entry.value += (w / lotWeight) * amountOf(tx);
      entry.consignments += 1;
    });
  });

  const categoryBreakdown = [...catMap.values()]
    .map((c) => ({ ...c, weight: round(c.weight), value: round(c.value), share: pct(c.weight, totalWeight) }))
    .sort((a, b) => b.weight - a.weight);

  // --- region-wise breakdown ---
  const regionMap = new Map();
  scoped.forEach((tx) => {
    const name = tx.collectionLocation || tx.collector?.operatingLocation || "Unspecified region";
    const entry = regionMap.get(name) || { region: name, weight: 0, value: 0, consignments: 0, collectors: new Set() };
    entry.weight += weightOf(tx);
    entry.value += amountOf(tx);
    entry.consignments += 1;
    if (tx.collector?._id) entry.collectors.add(String(tx.collector._id));
    regionMap.set(name, entry);
  });

  const regionBreakdown = [...regionMap.values()]
    .map((r) => ({
      region: r.region,
      weight: round(r.weight),
      value: round(r.value),
      consignments: r.consignments,
      collectors: r.collectors.size,
      share: pct(r.weight, totalWeight),
    }))
    .sort((a, b) => b.weight - a.weight);

  // --- traceability completeness (the audit-grade metric) ---
  const hasGps = scoped.filter((tx) => tx.collectionGps?.lat || tx.lot?.gpsLat).length;
  const hasPhotos = scoped.filter((tx) => (tx.handoverPhotos?.length || tx.lot?.photoUrls?.length) > 0).length;
  const hasReference = scoped.filter((tx) => Boolean(tx.handoverReference)).length;
  const recyclerConfirmed = scoped.filter((tx) => Boolean(tx.recyclerConfirmedAt)).length;
  const signed = scoped.filter((tx) => Boolean(tx.signature)).length;

  const traceability = {
    gpsTagged: { count: hasGps, pct: pct(hasGps, scoped.length) },
    photoEvidence: { count: hasPhotos, pct: pct(hasPhotos, scoped.length) },
    uniqueReference: { count: hasReference, pct: pct(hasReference, scoped.length) },
    recyclerConfirmed: { count: recyclerConfirmed, pct: pct(recyclerConfirmed, scoped.length) },
    digitallySigned: { count: signed, pct: pct(signed, scoped.length) },
  };

  const completeRecords = scoped.filter(
    (tx) => (tx.collectionGps?.lat || tx.lot?.gpsLat) && tx.handoverReference && tx.recyclerConfirmedAt
  ).length;

  // --- downstream destination status ---
  const destMap = new Map([
    ["awaiting_handover", 0], ["received_by_authorized_recycler", 0], ["sorting", 0], ["recycled", 0],
  ]);
  scoped.forEach((tx) => {
    const key = tx.destinationStatus || "awaiting_handover";
    destMap.set(key, (destMap.get(key) || 0) + 1);
  });
  const destinationStatus = [...destMap.entries()].map(([status, count]) => ({
    status,
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count,
    pct: pct(count, scoped.length),
  }));

  // --- participants ---
  const uniqueCollectors = new Set(scoped.map((tx) => String(tx.collector?._id || tx.collector))).size;
  const uniqueRecyclers = new Set(scoped.map((tx) => String(tx.recycler?._id || tx.recycler))).size;
  const authorizedRecyclerTx = scoped.filter((tx) => tx.recycler?.authorized).length;

  const [registeredCollectors, authorizedRecyclers] = await Promise.all([
    Collector.countDocuments({}),
    Recycler.countDocuments({ authorized: true }),
  ]);

  return {
    meta: {
      reportId: `CPCB-KBC-${fromDate.toISOString().slice(0, 10)}-${toDate.toISOString().slice(0, 10)}`,
      generatedAt: new Date(),
      period: { from: fromDate, to: toDate },
      region: region || "all",
      ruleReference: "E-Waste (Management) Rules, 2022 — Schedule III",
      basis: "Platform-recorded consignments from informal collectors to authorized recyclers",
    },
    summary: {
      totalWeightKg: totalWeight,
      totalWeightTonnes: round(totalWeight / 1000, 3),
      totalValue,
      consignments: scoped.length,
      activeCollectors: uniqueCollectors,
      registeredCollectors,
      engagedRecyclers: uniqueRecyclers,
      authorizedRecyclers,
      authorizedChannelPct: pct(authorizedRecyclerTx, scoped.length),
      traceabilityScore: pct(completeRecords, scoped.length),
      completeRecords,
    },
    categoryBreakdown,
    regionBreakdown,
    traceability,
    destinationStatus,
  };
};
