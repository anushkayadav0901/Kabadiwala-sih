import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { AreaChart, BarChart, MixBars, DayPattern, StatTile } from "../components/Charts";
import { useApp } from "../context/AppContext";
import { getCollectorAnalytics, demoAnalytics } from "../services/analyticsService";
import { formatCurrency, formatWeight } from "../utils/helpers";
import {
  HiOutlineExclamationTriangle, HiOutlineArrowPath, HiOutlineFire,
  HiOutlineCalendarDays, HiOutlineTrophy, HiOutlineLightBulb,
  HiOutlineScale, HiOutlineBanknotes, HiChevronRight
} from "react-icons/hi2";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const METRICS = [
  { key: "earnings", label: "Earnings", format: (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
  { key: "weight", label: "Weight", format: (v) => `${Number(v).toFixed(0)}kg` },
  { key: "trips", label: "Trips", format: (v) => String(v) },
];

const shortDate = (d) => {
  const dt = new Date(d.date);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("earnings");
  const [isDemo, setIsDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCollectorAnalytics(user?.id, days);
      // A brand-new collector has no history yet — demo data communicates the
      // shape of the dashboard better than seven empty charts.
      if (!res?.summary?.trips) throw new Error("no history");
      setData(res);
      setIsDemo(false);
    } catch {
      setData(demoAnalytics(days));
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, days]);

  useEffect(() => { load(); }, [load]);

  const activeMetric = METRICS.find((m) => m.key === metric);
  const s = data?.summary;
  const mix = data?.materialMix || [];
  const topMaterial = mix[0];
  const bestRate = [...mix].sort((a, b) => b.ratePerKg - a.ratePerKg)[0];

  const insights = [];
  if (topMaterial) {
    insights.push({
      icon: HiOutlineTrophy,
      text: `${topMaterial.label} brings you the most money — ${topMaterial.earningsShare}% of your earnings from ${topMaterial.weightShare}% of your weight.`,
    });
  }
  if (bestRate && bestRate.category !== topMaterial?.category) {
    insights.push({
      icon: HiOutlineLightBulb,
      text: `${bestRate.label} pays the best rate at ${formatCurrency(bestRate.ratePerKg)}/kg. Collecting more of it raises your average.`,
    });
  }
  if (s?.bestDay) {
    insights.push({
      icon: HiOutlineCalendarDays,
      text: `${s.bestDay} is your strongest day. Plan your heaviest routes around it.`,
    });
  }
  if (s?.activeDays && data?.period?.days) {
    const rest = data.period.days - s.activeDays;
    if (rest > 0) {
      insights.push({
        icon: HiOutlineFire,
        text: `You collected on ${s.activeDays} of ${data.period.days} days. Even one extra trip a week adds about ${formatCurrency((s.avgPerTrip || 0) * 4)} a month.`,
      });
    }
  }

  return (
    <div className="screen pb-nav">
      <Navbar title="My Analytics" />

      <main className="col px-4 pt-4 flex flex-col gap-5">
        <section>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight">Collection Insights</h2>
              <p className="text-[13px] text-faint mt-0.5">Understand what earns you the most</p>
            </div>
            <button onClick={load} disabled={loading}
              className="w-10 h-10 rounded-xl bg-sunken grid place-items-center tap disabled:opacity-50 shrink-0">
              <HiOutlineArrowPath className={`text-lg ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isDemo && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12.5px] text-amber-700 flex items-start gap-2">
              <HiOutlineExclamationTriangle className="text-base shrink-0 mt-0.5" />
              <span>Sample data — complete a few handovers and your real numbers appear here.</span>
            </div>
          )}
        </section>

        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button key={r.value} onClick={() => setDays(r.value)}
              className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold tap transition-colors ${
                days === r.value ? "bg-brand-600 text-white" : "bg-sunken text-faint hover:text-ink"
              }`}>
              {r.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader message="Crunching your numbers" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile label="Total earned" value={formatCurrency(s.earnings)} delta={data.comparison?.earnings} />
              <StatTile label="Total collected" value={formatWeight(s.weight)} delta={data.comparison?.weight} />
              <StatTile label="Trips completed" value={s.trips} delta={data.comparison?.trips} />
              <StatTile label="Average per trip" value={formatCurrency(s.avgPerTrip)} sub={`${formatCurrency(s.avgRatePerKg)}/kg average`} />
            </div>

            {/* trend */}
            <section className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-ink">Daily trend</h3>
                <div className="flex gap-1">
                  {METRICS.map((m) => (
                    <button key={m.key} onClick={() => setMetric(m.key)}
                      className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold tap transition-colors ${
                        metric === m.key ? "bg-brand-600 text-white" : "bg-sunken text-faint"
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <AreaChart data={data.dailySeries} valueKey={metric} format={activeMetric.format} labelFor={shortDate} />
            </section>

            {/* weekly */}
            {data.weeklySeries?.length > 1 && (
              <section className="card p-4">
                <h3 className="text-[14px] font-semibold text-ink mb-1">Week by week</h3>
                <p className="text-[12px] text-faint mb-3">{activeMetric.label} grouped into weeks</p>
                <BarChart data={data.weeklySeries} valueKey={metric} format={activeMetric.format} />
              </section>
            )}

            {/* material mix */}
            <section className="card p-4">
              <h3 className="text-[14px] font-semibold text-ink mb-1">What you collect</h3>
              <p className="text-[12px] text-faint mb-3">Share of total weight, by material</p>
              <MixBars data={mix} valueKey="weightShare"
                subFormat={(d) => `${formatWeight(d.weight)} · ${formatCurrency(d.earnings)} · ${formatCurrency(d.ratePerKg)}/kg`} />
            </section>

            {/* earnings share */}
            <section className="card p-4">
              <h3 className="text-[14px] font-semibold text-ink mb-1">What actually pays</h3>
              <p className="text-[12px] text-faint mb-3">Share of total earnings — compare against weight above</p>
              <MixBars data={[...mix].sort((a, b) => b.earningsShare - a.earningsShare)} valueKey="earningsShare" />
            </section>

            {/* day pattern */}
            <section className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[14px] font-semibold text-ink">Your week</h3>
                {s.streak > 0 && (
                  <span className="badge bg-gold-50 text-gold-700 flex items-center gap-1">
                    <HiOutlineFire className="text-[13px]" /> {s.streak} day streak
                  </span>
                )}
              </div>
              <p className="text-[12px] text-faint mb-3">Earnings by day of the week</p>
              <DayPattern data={data.dayPattern} valueKey="earnings" format={(v) => formatCurrency(v)} />
            </section>

            {/* recyclers */}
            {data.topRecyclers?.length > 0 && (
              <section className="card p-4">
                <h3 className="text-[14px] font-semibold text-ink mb-1">Who you sell to</h3>
                <p className="text-[12px] text-faint mb-3">Selling to more buyers gives you better bargaining power</p>
                <div className="flex flex-col gap-2.5">
                  {data.topRecyclers.map((r) => (
                    <div key={r.name}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-[12.5px] font-semibold text-ink truncate">{r.name}</span>
                        <span className="text-[12.5px] font-bold tnum shrink-0">{r.share}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${r.share}%` }} />
                      </div>
                      <p className="text-[11px] text-faint mt-0.5">{formatCurrency(r.earnings)} · {r.trips} trips</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* insights */}
            {insights.length > 0 && (
              <section className="card p-4">
                <h3 className="text-[14px] font-semibold text-ink mb-3">What this means</h3>
                <div className="flex flex-col gap-3">
                  {insights.map((ins, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }} className="flex items-start gap-2.5">
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
                        <ins.icon className="text-[15px]" />
                      </span>
                      <p className="text-[13px] text-slate leading-snug pt-0.5" style={{ color: "var(--color-muted)" }}>{ins.text}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            <button onClick={() => navigate("/economics")}
              className="card p-4 flex items-center gap-3 text-left tap active:bg-sunken/50 transition-colors mb-2">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-gold-50 text-gold-600 grid place-items-center">
                <HiOutlineBanknotes className="text-xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">See your profit, not just earnings</span>
                <span className="block text-[12.5px] text-faint">Unit economics subtracts your real costs</span>
              </span>
              <HiChevronRight className="text-faint shrink-0" />
            </button>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};
