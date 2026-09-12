const DEFAULT_COSTS = {
  transportPerTrip: 80,
  sortingPerHour: 60,
  avgSortingHours: 0.75,
  storagePerDay: 15,
  avgStorageDays: 2,
  phoneDataPerMonth: 299,
  equipmentPerMonth: 200,
};

export const computeTripEconomics = (summary, transactions, costs = {}) => {
  const c = { ...DEFAULT_COSTS, ...costs };
  const trips = summary?.completedDeals || 0;
  const totalRevenue = summary?.totalEarnings || 0;
  const totalWeight = summary?.formalWeightKg || 0;

  const avgRevenuePerTrip = trips > 0 ? totalRevenue / trips : 0;
  const avgWeightPerTrip = trips > 0 ? totalWeight / trips : 0;
  const revenuePerKg = totalWeight > 0 ? totalRevenue / totalWeight : 0;

  const costPerTrip = c.transportPerTrip + (c.sortingPerHour * c.avgSortingHours) + (c.storagePerDay * c.avgStorageDays);
  const profitPerTrip = avgRevenuePerTrip - costPerTrip;
  const marginPercent = avgRevenuePerTrip > 0 ? (profitPerTrip / avgRevenuePerTrip) * 100 : 0;

  const fixedMonthly = c.phoneDataPerMonth + c.equipmentPerMonth;
  const tripsToBreakEven = profitPerTrip > 0 ? Math.ceil(fixedMonthly / profitPerTrip) : null;

  return {
    trips,
    totalRevenue,
    totalWeight,
    avgRevenuePerTrip,
    avgWeightPerTrip,
    revenuePerKg,
    costPerTrip,
    profitPerTrip,
    marginPercent,
    fixedMonthly,
    tripsToBreakEven,
    costBreakdown: {
      transport: c.transportPerTrip,
      sorting: c.sortingPerHour * c.avgSortingHours,
      storage: c.storagePerDay * c.avgStorageDays,
    },
  };
};

export const computeMaterialRanking = (transactions) => {
  const map = {};
  for (const tx of transactions) {
    const name = tx.materialName || "Other";
    if (!map[name]) map[name] = { name, totalKg: 0, totalEarned: 0, count: 0 };
    map[name].totalKg += Number(tx.weightKg || 0);
    map[name].totalEarned += Number(tx.totalAmount || 0);
    map[name].count += 1;
  }
  return Object.values(map)
    .map((m) => ({ ...m, perKg: m.totalKg > 0 ? m.totalEarned / m.totalKg : 0 }))
    .sort((a, b) => b.perKg - a.perKg);
};

export const computeProjections = (summary, daysSinceFirstTx) => {
  const days = daysSinceFirstTx || 30;
  const dailyRate = (summary?.totalEarnings || 0) / days;
  return {
    daily: dailyRate,
    weekly: dailyRate * 7,
    monthly: dailyRate * 30,
    yearly: dailyRate * 365,
  };
};

// ---------------------------------------------------------------------------
// Earnings today (selling to a local middleman) vs. with Kabadiwala Connect.
//
// Every number below is an ASSUMPTION the collector can change on screen. The
// defaults are placeholders to be replaced with figures from field interviews;
// they are not survey results.
// ---------------------------------------------------------------------------
export const DEFAULT_COMPARISON_ASSUMPTIONS = {
  middlemanDiscountPct: 20,  // how far below the fair market range a local middleman pays
  unsortedLossPct: 5,        // value lost by selling mixed, unsorted loads at the lowest item's rate
  mineralBonusAvgPct: 2,     // average critical-mineral bonus across all lots (most lots get none)
};

/**
 * @param {number} monthlyFairValue  what the collection is worth at fair market rates (₹/month)
 * @param {number} monthlyCosts      transport, sorting and storage — identical in both scenarios
 */
export const computeEarningsComparison = (monthlyFairValue, monthlyCosts, assumptions = {}) => {
  const a = { ...DEFAULT_COMPARISON_ASSUMPTIONS, ...assumptions };
  const fair = Math.max(0, Number(monthlyFairValue) || 0);
  const costs = Math.max(0, Number(monthlyCosts) || 0);

  const middlemanLoss = fair * (a.middlemanDiscountPct / 100);
  const unsortedLoss = fair * (a.unsortedLossPct / 100);
  const todayRevenue = fair - middlemanLoss - unsortedLoss;
  const mineralBonus = fair * (a.mineralBonusAvgPct / 100);
  const platformRevenue = fair + mineralBonus; // collectors pay no platform fee

  const todayProfit = todayRevenue - costs;
  const platformProfit = platformRevenue - costs;
  const gain = platformProfit - todayProfit;

  return {
    assumptions: a,
    today: { revenue: todayRevenue, costs, profit: todayProfit },
    withPlatform: { revenue: platformRevenue, costs, profit: platformProfit, platformFee: 0 },
    gain,
    gainPct: todayProfit > 0 ? (gain / todayProfit) * 100 : null,
    yearlyGain: gain * 12,
    breakdown: [
      { label: "Fair market price instead of middleman rate", amount: middlemanLoss },
      { label: "Sorted loads priced item by item", amount: unsortedLoss },
      { label: "Critical mineral bonus", amount: mineralBonus },
    ],
  };
};

// ---------------------------------------------------------------------------
// How the platform sustains itself. Collectors pay nothing; recyclers pay a
// commission on completed sales and producers pay for EPR compliance data.
// All values are adjustable assumptions for a pilot, not audited costs.
// ---------------------------------------------------------------------------
export const DEFAULT_PLATFORM_ASSUMPTIONS = {
  activeCollectors: 500,
  commissionPct: 2,                 // paid by the recycler on each completed sale
  eprProducers: 2,
  eprFeePerProducerMonthly: 10000,  // EPR compliance data subscription
  fixedMonthly: 5000,               // hosting, database, monitoring
  scansPerCollectorMonthly: 60,
  onlineScanSharePct: 20,           // most scans run on-device for free
  aiCostPerOnlineScan: 0.1,         // ₹ per online AI call
  messagingPerCollectorMonthly: 15, // WhatsApp conversations
};

export const computePlatformEconomics = (gmvPerCollectorMonthly, assumptions = {}) => {
  const a = { ...DEFAULT_PLATFORM_ASSUMPTIONS, ...assumptions };
  const gmvEach = Math.max(0, Number(gmvPerCollectorMonthly) || 0);
  const collectors = Math.max(0, Math.round(a.activeCollectors));

  const gmv = gmvEach * collectors;
  const commissionRevenue = gmv * (a.commissionPct / 100);
  const eprRevenue = a.eprProducers * a.eprFeePerProducerMonthly;
  const revenue = commissionRevenue + eprRevenue;

  const aiCostEach = a.scansPerCollectorMonthly * (a.onlineScanSharePct / 100) * a.aiCostPerOnlineScan;
  const variableCostEach = aiCostEach + a.messagingPerCollectorMonthly;
  const costs = a.fixedMonthly + variableCostEach * collectors;
  const profit = revenue - costs;

  // Collectors needed before revenue covers costs.
  const contributionEach = gmvEach * (a.commissionPct / 100) - variableCostEach;
  const uncovered = a.fixedMonthly - eprRevenue;
  const breakEvenCollectors = uncovered <= 0 ? 0 : contributionEach > 0 ? Math.ceil(uncovered / contributionEach) : null;

  return {
    assumptions: a,
    gmv,
    revenue,
    costs,
    profit,
    revenueStreams: [
      { label: `Recycler commission (${a.commissionPct}% of sales)`, amount: commissionRevenue },
      { label: `EPR data for ${a.eprProducers} producer${a.eprProducers === 1 ? "" : "s"}`, amount: eprRevenue },
    ],
    costLines: [
      { label: "Hosting & database", amount: a.fixedMonthly },
      { label: "Online AI scans", amount: aiCostEach * collectors },
      { label: "WhatsApp messaging", amount: a.messagingPerCollectorMonthly * collectors },
    ],
    perCollector: { revenue: collectors ? revenue / collectors : 0, cost: collectors ? costs / collectors : 0 },
    breakEvenCollectors,
  };
};

export const DEMO_SUMMARY = {
  totalEarnings: 47850,
  completedDeals: 34,
  todayEarnings: 1800,
  monthlyEarnings: 18250,
  pendingDues: 3200,
  formalWeightKg: 412,
};

export const DEMO_TRANSACTIONS = [
  { id: "t1", materialName: "E-Waste PCB Board", weightKg: 12, totalAmount: 2880, date: "2026-09-07", status: "Paid" },
  { id: "t2", materialName: "Copper Wire", weightKg: 8, totalAmount: 4800, date: "2026-09-06", status: "Paid" },
  { id: "t3", materialName: "Mobile Phone Scrap", weightKg: 3, totalAmount: 1950, date: "2026-09-06", status: "Paid" },
  { id: "t4", materialName: "Television / Monitor Scrap", weightKg: 25, totalAmount: 3000, date: "2026-09-05", status: "Paid" },
  { id: "t5", materialName: "Computer Keyboard Scrap", weightKg: 15, totalAmount: 1800, date: "2026-09-04", status: "Paid" },
  { id: "t6", materialName: "Copper Wire", weightKg: 10, totalAmount: 6000, date: "2026-09-03", status: "Paid" },
  { id: "t7", materialName: "E-Waste PCB Board", weightKg: 20, totalAmount: 4800, date: "2026-09-02", status: "Paid" },
  { id: "t8", materialName: "Batteries / Li-ion", weightKg: 5, totalAmount: 1500, date: "2026-09-01", status: "Paid" },
  { id: "t9", materialName: "Computer Mouse Scrap", weightKg: 10, totalAmount: 1000, date: "2026-08-30", status: "Paid" },
  { id: "t10", materialName: "Copper Wire", weightKg: 6, totalAmount: 3600, date: "2026-08-28", status: "Paid" },
];
