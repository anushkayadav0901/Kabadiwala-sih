import { api } from "./api";

export const getCollectorAnalytics = (collectorId, days = 30) =>
  api(`/collector/${collectorId}/analytics?days=${days}`, { auth: true });

export const getCpcbReport = ({ from, to, region } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (region && region !== "all") params.set("region", region);
  const qs = params.toString();
  return api(`/reports/cpcb${qs ? `?${qs}` : ""}`, { auth: true });
};

// --- demo fallbacks -------------------------------------------------------
// Shown when the API is unreachable so the dashboard still demonstrates its
// full shape. Every screen that uses these also shows a "demo data" banner.

const seededDaily = (days) => {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000);
    const dow = d.getDay();
    const busy = dow === 0 || dow === 6 ? 0.45 : 1;
    const wave = 0.6 + 0.4 * Math.sin(i / 3.2);
    const skip = i % 7 === 3;
    const trips = skip ? 0 : Math.max(0, Math.round((1 + wave) * busy));
    out.push({
      date: d.toISOString().slice(0, 10),
      trips,
      weight: Number((trips * (12 + wave * 9)).toFixed(2)),
      earnings: Number((trips * (285 + wave * 190)).toFixed(2)),
    });
  }
  return out;
};

export const demoAnalytics = (days = 30) => {
  const dailySeries = seededDaily(days);
  const sum = (k) => Number(dailySeries.reduce((s, d) => s + d[k], 0).toFixed(2));
  const earnings = sum("earnings");
  const weight = sum("weight");
  const trips = dailySeries.reduce((s, d) => s + d.trips, 0);

  const weeklySeries = [];
  for (let i = 0; i < dailySeries.length; i += 7) {
    const chunk = dailySeries.slice(i, i + 7);
    weeklySeries.push({
      label: `W${weeklySeries.length + 1}`,
      earnings: Number(chunk.reduce((s, d) => s + d.earnings, 0).toFixed(2)),
      weight: Number(chunk.reduce((s, d) => s + d.weight, 0).toFixed(2)),
      trips: chunk.reduce((s, d) => s + d.trips, 0),
    });
  }

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayPattern = DAY_NAMES.map((day) => ({ day, earnings: 0, weight: 0, trips: 0 }));
  dailySeries.forEach((d) => {
    const b = dayPattern[new Date(d.date).getDay()];
    b.earnings = Number((b.earnings + d.earnings).toFixed(2));
    b.weight = Number((b.weight + d.weight).toFixed(2));
    b.trips += d.trips;
  });

  const mix = [
    { category: "PCB", label: "Printed Circuit Boards", weight: 0.14, rate: 640 },
    { category: "cables", label: "Cables & Wiring", weight: 0.27, rate: 168 },
    { category: "batteries", label: "Batteries", weight: 0.16, rate: 102 },
    { category: "motors", label: "Motors & Magnet Assemblies", weight: 0.18, rate: 88 },
    { category: "LCD", label: "LCD / LED Panels", weight: 0.11, rate: 124 },
    { category: "mixed_plastic", label: "Mixed Plastics", weight: 0.10, rate: 22 },
    { category: "CRT", label: "CRT Glass & Displays", weight: 0.04, rate: 9 },
  ];
  const mixWeights = mix.map((m) => Number((weight * m.weight).toFixed(2)));
  const mixEarnings = mix.map((m, i) => Number((mixWeights[i] * m.rate).toFixed(2)));
  const totalMixEarnings = mixEarnings.reduce((s, v) => s + v, 0);

  const materialMix = mix
    .map((m, i) => ({
      category: m.category,
      label: m.label,
      weight: mixWeights[i],
      earnings: mixEarnings[i],
      trips: Math.max(1, Math.round(trips * m.weight)),
      weightShare: Number((m.weight * 100).toFixed(1)),
      earningsShare: Number(((mixEarnings[i] / totalMixEarnings) * 100).toFixed(1)),
      ratePerKg: m.rate,
    }))
    .sort((a, b) => b.earnings - a.earnings);

  let streak = 0;
  for (let i = dailySeries.length - 1; i >= 0; i -= 1) {
    if (dailySeries[i].trips > 0) streak += 1;
    else if (i < dailySeries.length - 1) break;
  }

  const bestDay = [...dayPattern].sort((a, b) => b.earnings - a.earnings)[0];

  return {
    period: { days },
    summary: {
      earnings, weight, trips,
      avgPerTrip: trips ? Number((earnings / trips).toFixed(2)) : 0,
      avgRatePerKg: weight ? Number((earnings / weight).toFixed(2)) : 0,
      activeDays: dailySeries.filter((d) => d.trips > 0).length,
      streak,
      bestDay: bestDay?.day || null,
    },
    comparison: { earnings: 18.4, weight: 12.1, trips: 9.7, previous: {} },
    dailySeries,
    weeklySeries,
    materialMix,
    dayPattern,
    topRecyclers: [
      { name: "Faridabad Battery Solutions", earnings: Number((earnings * 0.42).toFixed(2)), trips: Math.round(trips * 0.4), share: 42 },
      { name: "GreenTech E-Waste Pvt Ltd", earnings: Number((earnings * 0.31).toFixed(2)), trips: Math.round(trips * 0.3), share: 31 },
      { name: "Sector 24 Metal Traders", earnings: Number((earnings * 0.18).toFixed(2)), trips: Math.round(trips * 0.2), share: 18 },
      { name: "Okhla Recycling Hub", earnings: Number((earnings * 0.09).toFixed(2)), trips: Math.round(trips * 0.1), share: 9 },
    ],
  };
};

export const demoCpcbReport = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 86400000);
  const categories = [
    { category: "cables", label: "Cables & Wiring", weight: 4820.5, value: 809844 },
    { category: "motors", label: "Motors & Magnet Assemblies", weight: 3210.75, value: 282546 },
    { category: "batteries", label: "Batteries", weight: 2864.2, value: 292148 },
    { category: "PCB", label: "Printed Circuit Boards", weight: 1932.4, value: 1236736 },
    { category: "LCD", label: "LCD / LED Panels", weight: 1745.8, value: 216479 },
    { category: "mixed_plastic", label: "Mixed Plastics", weight: 1284.6, value: 28261 },
    { category: "CRT", label: "CRT Glass & Displays", weight: 742.3, value: 6681 },
    { category: "other", label: "Other / Unclassified", weight: 318.9, value: 19134 },
  ];
  const totalWeight = Number(categories.reduce((s, c) => s + c.weight, 0).toFixed(2));
  const totalValue = Number(categories.reduce((s, c) => s + c.value, 0).toFixed(2));

  return {
    meta: {
      reportId: `CPCB-KBC-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}`,
      generatedAt: new Date(),
      period: { from, to },
      region: "all",
      ruleReference: "E-Waste (Management) Rules, 2022 — Schedule III",
      basis: "Platform-recorded consignments from informal collectors to authorized recyclers",
    },
    summary: {
      totalWeightKg: totalWeight,
      totalWeightTonnes: Number((totalWeight / 1000).toFixed(3)),
      totalValue,
      consignments: 1247,
      activeCollectors: 186,
      registeredCollectors: 243,
      engagedRecyclers: 22,
      authorizedRecyclers: 28,
      authorizedChannelPct: 94.2,
      traceabilityScore: 88.6,
      completeRecords: 1105,
    },
    categoryBreakdown: categories.map((c) => ({
      ...c,
      consignments: Math.round((c.weight / totalWeight) * 1247),
      share: Number(((c.weight / totalWeight) * 100).toFixed(1)),
    })),
    regionBreakdown: [
      { region: "Faridabad, Haryana", weight: 5124.3, value: 894210, consignments: 412, collectors: 61, share: 30.5 },
      { region: "South Delhi", weight: 4318.7, value: 762430, consignments: 351, collectors: 52, share: 25.7 },
      { region: "Noida, Uttar Pradesh", weight: 3506.2, value: 598120, consignments: 268, collectors: 39, share: 20.9 },
      { region: "Ghaziabad, Uttar Pradesh", weight: 2340.8, value: 401560, consignments: 148, collectors: 22, share: 13.9 },
      { region: "Gurugram, Haryana", weight: 1629.45, value: 235509, consignments: 68, collectors: 12, share: 9.7 },
    ],
    traceability: {
      gpsTagged: { count: 1198, pct: 96.1 },
      photoEvidence: { count: 1156, pct: 92.7 },
      uniqueReference: { count: 1247, pct: 100 },
      recyclerConfirmed: { count: 1121, pct: 89.9 },
      digitallySigned: { count: 1105, pct: 88.6 },
    },
    destinationStatus: [
      { status: "recycled", label: "Recycled", count: 742, pct: 59.5 },
      { status: "sorting", label: "Sorting", count: 268, pct: 21.5 },
      { status: "received_by_authorized_recycler", label: "Received By Authorized Recycler", count: 195, pct: 15.6 },
      { status: "awaiting_handover", label: "Awaiting Handover", count: 42, pct: 3.4 },
    ],
  };
};
