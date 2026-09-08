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
