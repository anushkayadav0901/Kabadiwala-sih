import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Loader } from "../components/Loader";
import { MixBars, SERIES } from "../components/Charts";
import { getCpcbReport, demoCpcbReport } from "../services/analyticsService";
import { generateCpcbReport } from "../utils/generateCpcbReport";
import { formatCurrency } from "../utils/helpers";
import {
  HiOutlineDocumentArrowDown, HiOutlineExclamationTriangle, HiOutlineArrowPath,
  HiOutlineBuildingLibrary, HiOutlineMapPin, HiOutlineCheckBadge,
  HiOutlineShieldCheck, HiOutlineTruck, HiOutlineUsers
} from "react-icons/hi2";

const PERIODS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "Quarter" },
  { value: 180, label: "Half year" },
  { value: 365, label: "Year" },
];

const dmy = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const TraceRow = ({ label, count, pct }) => (
  <div>
    <div className="flex items-baseline justify-between gap-2 mb-1">
      <span className="text-[12.5px] text-ink font-medium">{label}</span>
      <span className="text-[12.5px] font-bold tnum shrink-0">{pct}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
      <div className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: pct >= 90 ? "#0ca30c" : pct >= 70 ? "#fab219" : "#d03b3b" }} />
    </div>
    <p className="text-[11px] text-faint mt-0.5 tnum">{count.toLocaleString("en-IN")} records</p>
  </div>
);

export const CPCBReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(90);
  const [region, setRegion] = useState("all");
  const [isDemo, setIsDemo] = useState(false);
  // A live deployment has thousands of consignments; a dev database has a
  // handful. The toggle lets the full-scale report be shown without ever
  // dressing up live figures as something they are not.
  const [useDemoData, setUseDemoData] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (useDemoData) {
      setReport(demoCpcbReport());
      setIsDemo(true);
      setLoading(false);
      return;
    }
    try {
      const to = new Date();
      const from = new Date(to.getTime() - period * 86400000);
      const res = await getCpcbReport({ from: from.toISOString(), to: to.toISOString(), region });
      if (!res?.summary?.consignments) throw new Error("no records");
      setReport(res);
      setIsDemo(false);
    } catch {
      setReport(demoCpcbReport());
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [period, region, useDemoData]);

  useEffect(() => { load(); }, [load]);

  const s = report?.summary;
  const regions = report?.regionBreakdown?.map((r) => r.region) || [];

  return (
    <div className="screen pb-nav">
      <Navbar title="Regulatory Report" />

      <main className="col px-4 pt-4 flex flex-col gap-5">
        {/* official header */}
        <section className="rounded-[18px] overflow-hidden border border-line">
          <div className="bg-ink text-white p-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white/10 grid place-items-center">
                <HiOutlineBuildingLibrary className="text-xl" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">CPCB / SPCB Submission</p>
                <h2 className="text-[17px] font-bold tracking-[-0.015em] leading-tight mt-0.5">
                  E-Waste Channelization Report
                </h2>
                <p className="text-[12px] text-white/60 mt-1 leading-snug">
                  E-Waste (Management) Rules, 2022 — Schedule III
                </p>
              </div>
            </div>
          </div>
          {report && (
            <div className="bg-sunken/50 px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-faint truncate">{report.meta.reportId}</span>
              <span className="text-[11px] text-faint shrink-0">
                {dmy(report.meta.period.from)} – {dmy(report.meta.period.to)}
              </span>
            </div>
          )}
        </section>

        {/* dataset source */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-sunken">
          {[
            { demo: false, label: "Live records" },
            { demo: true, label: "Demonstration" },
          ].map((opt) => (
            <button key={opt.label} onClick={() => setUseDemoData(opt.demo)}
              className={`flex-1 h-9 rounded-lg text-[12.5px] font-semibold tap transition-colors ${
                useDemoData === opt.demo ? "bg-surface text-ink shadow-xs" : "text-faint"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        {isDemo && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12.5px] text-amber-700 flex items-start gap-2">
            <HiOutlineExclamationTriangle className="text-base shrink-0 mt-0.5" />
            <span>
              {useDemoData
                ? "Demonstration dataset — illustrative figures showing the report at deployment scale. Not live data."
                : "No consignments recorded in this period — showing the demonstration dataset instead."}
            </span>
          </div>
        )}

        {/* filters — the demonstration dataset is a fixed 90-day snapshot, so
            period and region selection only apply to live records. */}
        <div className={`flex-col gap-2 ${useDemoData ? "hidden" : "flex"}`}>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap tap transition-colors ${
                  period === p.value ? "bg-brand-600 text-white" : "bg-sunken text-faint hover:text-ink"
                }`}>
                {p.label}
              </button>
            ))}
            <button onClick={load} disabled={loading}
              className="w-9 h-9 rounded-lg bg-sunken grid place-items-center tap disabled:opacity-50 shrink-0 ml-auto">
              <HiOutlineArrowPath className={`text-base ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {regions.length > 1 && (
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="field text-[13px] h-10">
              <option value="all">All regions</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <Loader message="Compiling report" />
        ) : (
          <>
            {/* headline figures */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-4 col-span-2 bg-brand-600 border-brand-600">
                <p className="text-[11.5px] text-white/60 font-medium">Total e-waste channelized to authorized recyclers</p>
                <p className="text-[32px] font-bold text-white tnum leading-none mt-1.5">
                  {s.totalWeightTonnes} <span className="text-[18px] font-semibold text-white/70">MT</span>
                </p>
                <p className="text-[12px] text-white/60 mt-1.5 tnum">
                  {s.totalWeightKg.toLocaleString("en-IN")} kg across {s.consignments.toLocaleString("en-IN")} consignments
                </p>
              </div>

              <div className="card p-3.5">
                <p className="text-[11px] text-faint font-medium">Traceability score</p>
                <p className="text-[22px] font-bold tnum leading-tight mt-0.5"
                  style={{ color: s.traceabilityScore >= 85 ? "#0ca30c" : "#fab219" }}>
                  {s.traceabilityScore}%
                </p>
                <p className="text-[11px] text-faint mt-0.5">{s.completeRecords} full audit trails</p>
              </div>

              <div className="card p-3.5">
                <p className="text-[11px] text-faint font-medium">Authorized channel</p>
                <p className="text-[22px] font-bold tnum leading-tight mt-0.5" style={{ color: "#0ca30c" }}>
                  {s.authorizedChannelPct}%
                </p>
                <p className="text-[11px] text-faint mt-0.5">to CPCB-registered units</p>
              </div>

              <div className="card p-3.5">
                <p className="text-[11px] text-faint font-medium">Active collectors</p>
                <p className="text-[22px] font-bold tnum leading-tight mt-0.5">{s.activeCollectors}</p>
                <p className="text-[11px] text-faint mt-0.5">of {s.registeredCollectors} registered</p>
              </div>

              <div className="card p-3.5">
                <p className="text-[11px] text-faint font-medium">Recorded value</p>
                <p className="text-[22px] font-bold tnum leading-tight mt-0.5">
                  ₹{(s.totalValue / 100000).toFixed(1)}L
                </p>
                <p className="text-[11px] text-faint mt-0.5">paid to collectors</p>
              </div>
            </div>

            {/* category breakdown */}
            <section className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineCheckBadge className="text-brand-600 text-base" />
                <h3 className="text-[14px] font-semibold text-ink">Category-wise channelization</h3>
              </div>
              <p className="text-[12px] text-faint mb-3">Seven material streams named in PS 26229</p>
              <MixBars data={report.categoryBreakdown} valueKey="share"
                subFormat={(d) => `${d.weight.toLocaleString("en-IN")} kg · ${d.consignments} consignments · ${formatCurrency(d.value)}`} />
            </section>

            {/* region breakdown */}
            <section className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineMapPin className="text-brand-600 text-base" />
                <h3 className="text-[14px] font-semibold text-ink">Region-wise collection</h3>
              </div>
              <p className="text-[12px] text-faint mb-3">Where the material originated</p>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="text-[12px]" style={{ minWidth: 340, width: "100%" }}>
                  <thead>
                    <tr className="text-faint text-[10px] uppercase tracking-wide">
                      <th className="text-left font-semibold pb-2 pr-3">Region</th>
                      <th className="text-right font-semibold pb-2 px-3 whitespace-nowrap">Weight</th>
                      <th className="text-right font-semibold pb-2 px-3">Share</th>
                      <th className="text-right font-semibold pb-2 pl-3">Collectors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair">
                    {report.regionBreakdown.map((r, i) => (
                      <tr key={r.region}>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: SERIES[i % SERIES.length] }} />
                            <span className="font-medium text-ink whitespace-nowrap">{r.region}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tnum whitespace-nowrap">{r.weight.toLocaleString("en-IN")} kg</td>
                        <td className="py-2 px-3 text-right tnum font-semibold">{r.share}%</td>
                        <td className="py-2 pl-3 text-right tnum">{r.collectors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* traceability */}
            <section className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineShieldCheck className="text-brand-600 text-base" />
                <h3 className="text-[14px] font-semibold text-ink">Traceability completeness</h3>
              </div>
              <p className="text-[12px] text-faint mb-3">Audit-grade evidence held per consignment</p>
              <div className="flex flex-col gap-2.5">
                <TraceRow label="GPS-tagged collection point" {...report.traceability.gpsTagged} />
                <TraceRow label="Photographic evidence" {...report.traceability.photoEvidence} />
                <TraceRow label="Unique handover reference" {...report.traceability.uniqueReference} />
                <TraceRow label="Confirmed by receiving recycler" {...report.traceability.recyclerConfirmed} />
                <TraceRow label="Digitally signed pass" {...report.traceability.digitallySigned} />
              </div>
            </section>

            {/* destination */}
            <section className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <HiOutlineTruck className="text-brand-600 text-base" />
                <h3 className="text-[14px] font-semibold text-ink">Downstream destination</h3>
              </div>
              <p className="text-[12px] text-faint mb-3">Where consignments currently sit in the recycling chain</p>
              <div className="h-3 rounded-full bg-sunken overflow-hidden flex gap-[2px]">
                {report.destinationStatus.map((d, i) => d.pct > 0 && (
                  <div key={d.status} style={{ width: `${d.pct}%`, background: SERIES[i % SERIES.length] }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                {report.destinationStatus.map((d, i) => (
                  <div key={d.status} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: SERIES[i % SERIES.length] }} />
                    <span className="text-[11.5px] text-ink truncate flex-1">{d.label}</span>
                    <span className="text-[11.5px] font-bold tnum shrink-0">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </section>

            {/* participation */}
            <section className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineUsers className="text-brand-600 text-base" />
                <h3 className="text-[14px] font-semibold text-ink">Participation</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Registered collectors", s.registeredCollectors],
                  ["Active this period", s.activeCollectors],
                  ["Authorized recyclers", s.authorizedRecyclers],
                  ["Engaged this period", s.engagedRecyclers],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2 pb-2 border-b border-hair">
                    <span className="text-[12px] text-faint">{label}</span>
                    <span className="text-[15px] font-bold tnum">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* export */}
            <button onClick={() => generateCpcbReport(report)}
              className="w-full h-12 rounded-xl bg-brand-600 text-white font-semibold text-[14.5px]
                         flex items-center justify-center gap-2 tap active:bg-brand-700 transition-colors">
              <HiOutlineDocumentArrowDown className="text-xl" />
              Download signed PDF report
            </button>

            <p className="text-[11px] text-faint leading-snug text-center px-2 mb-2">
              Report compiled from {s.consignments.toLocaleString("en-IN")} platform-recorded consignments.
              Each carries a unique handover reference, GPS coordinates and timestamp captured at collection.
            </p>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};
