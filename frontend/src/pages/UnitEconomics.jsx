import React, { useEffect, useState, useMemo } from "react";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { useApp } from "../context/AppContext";
import { getCollectorTransactions, getCollectorEarningsSummary } from "../services/transactionService";
import { formatCurrency } from "../utils/helpers";
import {
  computeTripEconomics,
  computeMaterialRanking,
  computeProjections,
  DEMO_SUMMARY,
  DEMO_TRANSACTIONS
} from "../utils/unitEconomics";
import {
  HiOutlineTruck,
  HiOutlineBanknotes,
  HiOutlineChartBarSquare,
  HiOutlineArrowTrendingUp,
  HiOutlineScale,
  HiOutlineCog6Tooth,
  HiChevronRight,
  HiMiniArrowUpRight,
} from "react-icons/hi2";

const Pill = ({ children, color = "brand" }) => (
  <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-${color}-50 text-${color}-700`}>
    {children}
  </span>
);

const StatCard = ({ icon: Icon, label, value, sub, accent = "brand" }) => (
  <div className="card p-4 flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <span className={`w-8 h-8 shrink-0 rounded-lg bg-${accent}-50 grid place-items-center`}>
        <Icon className={`text-[16px] text-${accent}-600`} />
      </span>
      <p className="eyebrow flex-1">{label}</p>
    </div>
    <p className="font-bold text-[22px] tnum tracking-[-0.02em] mt-1">{value}</p>
    {sub && <p className="text-[12px] text-faint tnum">{sub}</p>}
  </div>
);

const Bar = ({ pct, color }) => (
  <div className="h-2 rounded-full bg-sunken overflow-hidden">
    <div className={`h-full rounded-full bg-${color}-500 transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
  </div>
);

export const UnitEconomics = () => {
  const { user, t } = useApp();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCosts, setShowCosts] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setSummary(DEMO_SUMMARY);
      setTransactions(DEMO_TRANSACTIONS);
      setLoading(false);
      return;
    }
    Promise.all([
      getCollectorEarningsSummary(user.id),
      getCollectorTransactions(user.id)
    ])
      .then(([s, txs]) => {
        const hasTx = txs && txs.length > 0;
        setSummary(hasTx ? s : DEMO_SUMMARY);
        setTransactions(hasTx ? txs : DEMO_TRANSACTIONS);
      })
      .catch(() => {
        setSummary(DEMO_SUMMARY);
        setTransactions(DEMO_TRANSACTIONS);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const trip = useMemo(() => computeTripEconomics(summary, transactions), [summary, transactions]);
  const materials = useMemo(() => computeMaterialRanking(transactions), [transactions]);
  const projections = useMemo(() => {
    if (!transactions.length) return computeProjections(summary, 30);
    const dates = transactions.map((tx) => new Date(tx.date).getTime()).filter(Boolean);
    const span = dates.length > 1 ? Math.max(1, (Math.max(...dates) - Math.min(...dates)) / 86400000) : 30;
    return computeProjections(summary, span);
  }, [summary, transactions]);

  const topPerKg = materials[0]?.perKg || 0;

  if (loading) {
    return (
      <div className="screen pb-nav">
        <Navbar title="Unit Economics" />
        <main className="col px-4 pt-4"><Loader message="Crunching numbers" /></main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="screen pb-nav">
      <Navbar title="Unit Economics" />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- hero: per-trip profit ---------------------------------------- */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <p className="eyebrow text-white/50">Your average trip earns</p>
          <p className="font-bold text-[40px] tnum tracking-[-0.03em] leading-none mt-2">
            {formatCurrency(trip.profitPerTrip)}
            <span className="text-[16px] font-semibold text-white/50 ml-1.5">net profit</span>
          </p>
          <div className="flex items-center gap-3 mt-3 text-[13px] tnum text-white/60">
            <span>{formatCurrency(trip.avgRevenuePerTrip)} revenue</span>
            <span className="w-px h-3 bg-white/20" />
            <span>{formatCurrency(trip.costPerTrip)} costs</span>
            <span className="w-px h-3 bg-white/20" />
            <Pill color="emerald">
              <HiMiniArrowUpRight className="text-[10px]" />
              {trip.marginPercent.toFixed(0)}% margin
            </Pill>
          </div>
          <p className="text-[12px] text-white/40 mt-3 tnum">
            Based on {trip.trips} completed trips · avg {trip.avgWeightPerTrip.toFixed(1)} kg/trip
          </p>
        </section>

        {/* ---- per-trip breakdown -------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={HiOutlineBanknotes}
            label="Revenue / trip"
            value={formatCurrency(trip.avgRevenuePerTrip)}
            sub={`${formatCurrency(trip.revenuePerKg)}/kg avg`}
            accent="brand"
          />
          <StatCard
            icon={HiOutlineTruck}
            label="Cost / trip"
            value={formatCurrency(trip.costPerTrip)}
            sub="Transport + sorting + storage"
            accent="amber"
          />
        </div>

        {/* ---- cost breakdown toggle ---------------------------------------- */}
        <button
          onClick={() => setShowCosts(!showCosts)}
          className="card p-3.5 flex items-center gap-3 tap"
        >
          <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-50 grid place-items-center">
            <HiOutlineCog6Tooth className="text-[16px] text-amber-600" />
          </span>
          <span className="flex-1 text-left">
            <p className="text-[13.5px] font-semibold text-ink">Cost breakdown per trip</p>
            <p className="text-[12px] text-faint">Transport, sorting labor, storage</p>
          </span>
          <HiChevronRight className={`text-faint text-sm transition-transform ${showCosts ? "rotate-90" : ""}`} />
        </button>

        {showCosts && (
          <div className="card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
            {[
              { label: "Transport (auto/petrol)", amount: trip.costBreakdown.transport, pct: (trip.costBreakdown.transport / trip.costPerTrip) * 100, color: "blue" },
              { label: "Sorting labor (~45 min)", amount: trip.costBreakdown.sorting, pct: (trip.costBreakdown.sorting / trip.costPerTrip) * 100, color: "violet" },
              { label: "Storage (avg 2 days)", amount: trip.costBreakdown.storage, pct: (trip.costBreakdown.storage / trip.costPerTrip) * 100, color: "amber" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12.5px] text-muted">{row.label}</span>
                  <span className="text-[12.5px] font-bold tnum">{formatCurrency(row.amount)}</span>
                </div>
                <Bar pct={row.pct} color={row.color} />
              </div>
            ))}
            <p className="text-[11.5px] text-faint mt-1">
              Costs are estimates based on Delhi NCR averages. Adjust in your profile for accuracy.
            </p>
          </div>
        )}

        {/* ---- break-even ---------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={HiOutlineScale}
            label="Break-even"
            value={trip.tripsToBreakEven != null ? `${trip.tripsToBreakEven} trips/mo` : "N/A"}
            sub={`Covers ₹${trip.fixedMonthly} fixed costs`}
            accent="violet"
          />
          <StatCard
            icon={HiOutlineArrowTrendingUp}
            label="Monthly projection"
            value={formatCurrency(projections.monthly)}
            sub={`${formatCurrency(projections.daily)}/day pace`}
            accent="emerald"
          />
        </div>

        {/* ---- projections strip --------------------------------------------- */}
        <section className="rounded-[18px] bg-emerald-50 border border-emerald-100 p-4">
          <p className="eyebrow text-emerald-700">Earning projections at current pace</p>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: "Daily", value: projections.daily },
              { label: "Weekly", value: projections.weekly },
              { label: "Monthly", value: projections.monthly },
              { label: "Yearly", value: projections.yearly },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <p className="font-bold text-[16px] tnum text-emerald-800">{formatCurrency(p.value)}</p>
                <p className="text-[11px] text-emerald-700/70 font-medium mt-0.5">{p.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- material profitability ---------------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title flex items-center gap-2">
              <HiOutlineChartBarSquare className="text-base" />
              Best materials by ₹/kg
            </h3>
          </div>

          {materials.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[14px] font-semibold text-ink">No data yet</p>
              <p className="text-[13px] text-muted mt-1">Complete a few sales to see profitability breakdown.</p>
            </div>
          ) : (
            <div className="card divide-y divide-hair overflow-hidden">
              {materials.map((m, i) => (
                <div key={m.name} className="p-3.5 flex items-center gap-3">
                  <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[12px] font-bold ${i === 0 ? "bg-gold-100 text-gold-800" : "bg-sunken text-faint"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink truncate">{m.name}</p>
                    <p className="text-[12px] text-faint tnum">{m.totalKg.toFixed(1)} kg · {m.count} sale{m.count > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[15px] tnum">{formatCurrency(m.perKg)}<span className="text-[11px] text-faint font-medium">/kg</span></p>
                    <div className="w-16 mt-1">
                      <Bar pct={topPerKg > 0 ? (m.perKg / topPerKg) * 100 : 0} color={i === 0 ? "emerald" : "brand"} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---- insights ------------------------------------------------------ */}
        <section className="rounded-[18px] bg-blue-50 border border-blue-100 p-4">
          <p className="eyebrow text-blue-700">Insights</p>
          <ul className="mt-2 flex flex-col gap-2 text-[13px] text-blue-800">
            {materials[0] && (
              <li>
                <strong>{materials[0].name}</strong> is your most profitable material at {formatCurrency(materials[0].perKg)}/kg.
                {materials[1] && ` That's ${((materials[0].perKg / materials[1].perKg - 1) * 100).toFixed(0)}% more than ${materials[1].name}.`}
              </li>
            )}
            {trip.marginPercent > 0 && trip.marginPercent < 30 && (
              <li>Your margin is {trip.marginPercent.toFixed(0)}% — try combining smaller loads into fewer trips to save on transport.</li>
            )}
            {trip.marginPercent >= 30 && (
              <li>Your {trip.marginPercent.toFixed(0)}% margin is healthy — scaling up weight per trip will grow this further.</li>
            )}
            {trip.tripsToBreakEven != null && (
              <li>You need {trip.tripsToBreakEven} trips/month to cover phone + equipment. After that, every trip is pure profit.</li>
            )}
          </ul>
        </section>

        <p className="text-[12px] text-faint px-1 pb-4">
          Costs use Delhi NCR survey averages (JNARDDC 2024). Your actual costs may differ — these are a starting reference to understand your unit economics.
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
};
