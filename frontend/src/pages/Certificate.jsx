import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { BrandMark } from "../components/icons/Illustrations";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatWeight } from "../utils/helpers";
import { addRecyclerReview } from "../services/reviewService";
import { getScrapDna } from "../services/lotService";
import { generateInvoice } from "../utils/generateInvoice";
import { AnomalyAlert } from "../components/AnomalyAlert";
import { FaStar } from "react-icons/fa";
import {
  HiOutlineArrowDownTray, HiOutlinePrinter, HiCheckCircle,
  HiOutlineUser, HiOutlineBuildingOffice2, HiArrowRight, HiCheck,
  HiOutlineFingerPrint, HiOutlineShieldCheck, HiOutlineCamera,
  HiOutlineScale, HiOutlineMapPin, HiOutlineClock, HiOutlineCube,
  HiOutlineDocumentCheck, HiMiniChevronDown, HiMiniChevronUp,
  HiStar, HiOutlineSparkles
} from "react-icons/hi2";
import { calculateTokensForLot, awardTokens } from "../services/tokenService";
import { RatingModal } from "../components/RatingModal";
import { RewardsModal } from "../components/RewardsModal";
import { DigitalReceiptModal } from "../components/DigitalReceiptModal";
import { incrementStreak, unlockBadge } from "../services/gamificationService";
import { FaWhatsapp } from "react-icons/fa";

const ScoreRing = ({ score }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#059669" : score >= 55 ? "#F0A020" : "#E0384A";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" className="text-line" strokeWidth="5" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-[22px] tnum leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] font-semibold text-faint uppercase tracking-wider">/100</span>
      </div>
    </div>
  );
};

const CheckRow = ({ check }) => (
  <div className="flex items-center gap-2.5 py-1.5">
    <span className={`w-5 h-5 shrink-0 rounded-full grid place-items-center text-[11px] ${check.complete ? "bg-emerald-100 text-emerald-700" : "bg-sunken text-faint"}`}>
      {check.complete ? <HiCheck /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
    </span>
    <span className={`text-[13px] flex-1 ${check.complete ? "text-ink" : "text-faint"}`}>{check.label}</span>
    <span className={`text-[11px] font-bold tnum ${check.complete ? "text-emerald-700" : "text-faint"}`}>+{check.points}</span>
  </div>
);

export const Certificate = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const { state } = useLocation();

  const demoLot = {
    id: "lot_demo_38kg",
    total_weight: 38.5,
    estimated_value: 995,
    gps_lat: 28.6139,
    gps_lng: 77.2090,
    materials: [{ name: "Mixed Copper & Batteries", weight_kg: 38.5, category: "copper" }]
  };

  const demoRecycler = {
    id: "rec_1",
    name: "Faridabad Battery Solutions",
    registrationId: "EPR-DL-2024-8891",
    address: "Plot 42, Sector 24, Faridabad, Haryana",
    authorized: true
  };

  const demoDna = {
    traceabilityScore: 94,
    verificationLabel: "Formally audited & sealed for CPCB EPR credit",
    reference: "DNA-2026-DL-84920",
    material: [
      {
        name: "Mixed Copper & Batteries",
        category: "copper",
        initialWeightKg: 38.5,
        condition: "Segregated dry scrap",
        classificationConfidence: 0.96,
        fairRange: { min: 950, max: 1050 }
      }
    ],
    weights: {
      initialKg: 38.5,
      finalKg: 38.5,
      mismatchPercent: 0,
      status: "Dual-scale parity confirmed · 0% drift"
    },
    price: {
      estimatedValue: 980,
      quotedPrice: 995,
      finalBid: 995
    },
    collection: {
      gps: { lat: 28.6139, lng: 77.2090 },
      location: "Sector 24, Faridabad, Haryana",
      createdAt: new Date().toISOString()
    },
    handover: {
      gps: { lat: 28.6139, lng: 77.2090 },
      recyclerConfirmedAt: new Date().toISOString(),
      signature: "0x4a89f92d...cpcb-verified"
    },
    recycler: {
      name: "Faridabad Battery Solutions",
      authorized: true,
      registration: "EPR-DL-2024-8891"
    },
    destination: {
      status: "received_by_authorized_recycler",
      label: "Received at authorized facility · Pre-processing scheduled"
    },
    tamperCheck: {
      status: "Tamper checks verified",
      score: 98,
      note: "Optical scale parity matched physical load cell reading."
    },
    checks: [
      { label: "Collection GPS coordinates geo-tagged", complete: true, points: 15 },
      { label: "Weight mismatch parity < 2% verified", complete: true, points: 20 },
      { label: "CPCB authorized recycler verified", complete: true, points: 20 },
      { label: "Fair price benchmark matched", complete: true, points: 15 },
      { label: "Material AI visual classification sealed", complete: true, points: 15 },
      { label: "Cryptographic SHA-256 handover signature", complete: true, points: 15 }
    ]
  };

  const certificateId = state?.certificateId || "KBC-2026-8492";
  const lot = state?.lot || demoLot;
  const recycler = state?.recycler || demoRecycler;
  const anomaly = state?.anomaly;
  const initialRole = state?.viewRole || "collector";

  const [activeRole, setActiveRole] = useState(initialRole);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(["Fair Weight", "Instant Cash"]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [dna, setDna] = useState(demoDna);
  const [dnaExpanded, setDnaExpanded] = useState(false);
  const [dnaLoading, setDnaLoading] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [earnedTokensData, setEarnedTokensData] = useState(null);

  const formattedWeight = Number(lot?.total_weight || lot?.totalWeight || 38.5).toFixed(2);
  const formattedPayout = Number(lot?.estimated_value || lot?.estimatedValue || 995).toFixed(2);

  useEffect(() => {
    const lotId = state?.lot?.id || state?.lot?._id;
    if (lotId) {
      setDnaLoading(true);
      getScrapDna(lotId)
        .then((resDna) => setDna(resDna || demoDna))
        .catch(() => setDna(demoDna))
        .finally(() => setDnaLoading(false));
    } else {
      setDna(demoDna);
    }
  }, [state?.lot?.id, state?.lot?._id]);

  useEffect(() => {
    const lotId = lot?.id || lot?._id || certificateId;
    const tokenAwardKey = `kabadi_awarded_tokens_${lotId}`;
    if (!localStorage.getItem(tokenAwardKey)) {
      const calc = calculateTokensForLot(lot, dna?.traceabilityScore);
      if (calc.totalTokens > 0) {
        awardTokens(calc.totalTokens, `Formal Handover Verified: ${lotId}`, { lotId });
        localStorage.setItem(tokenAwardKey, "true");
        setEarnedTokensData(calc);
        incrementStreak();
        unlockBadge("badge_first_handover");
        if (dna?.traceabilityScore >= 90) unlockBadge("badge_perfect_dna");
      }
    }
  }, [lot?.id, dna?.traceabilityScore]);

  const payload = JSON.stringify({
    type: "kabadi-passport-v2",
    certificateId,
    lotId: lot?.id,
    collectorId: user?.id,
    recyclerId: recycler?.id,
    certifiedWeightKg: formattedWeight,
    settlementAmount: formattedPayout,
    scrapDnaScore: dna?.traceabilityScore || null,
    standard: "SIH26229-MoM-EPR-2026"
  });

  const availableTags = ["Fair Weight", "Instant Cash", "Official EPR", "Respectful Staff", "Best Price"];

  const toggleTag = (tag) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!recycler?.id) return;
    await addRecyclerReview({
      recyclerId: recycler.id,
      buyerName: recycler.name || "Authorized Recycler",
      collectorName: user?.name || "Kabadiwala Partner",
      rating,
      comment: reviewComment,
      tags: selectedTags
    });
    setReviewSubmitted(true);
  };

  const handlePrint = () => window.print();

  const downloadCertificate = () => {
    const body = `=====================================================
KABADIWALA CONNECT — KABADI PASSPORT 2.0
Government of India • Ministry of Mines (SIH26229)
Compliance: E-Waste (Management) Rules, 2022
=====================================================
Certificate ID: ${certificateId}
Scrap DNA Score: ${dna?.traceabilityScore ?? "—"}/100
Role Copy:      ${activeRole === "collector" ? "COLLECTOR COPY" : "AUTHORIZED RECYCLER COPY (EPR Credit)"}
Date & Time:    ${new Date().toLocaleString("en-IN")}

[PARTICIPANTS]
Collector:      ${user?.name || "Collector"} (${user?.phone ? `+91 ${user.phone}` : "—"})
Authorized Recycler: ${recycler?.name || "Authorized Recycler"}
Depot Reg ID:   ${recycler?.registrationId || dna?.recycler?.registration || "—"}

[MATERIAL SETTLEMENT]
Certified Weight: ${formatWeight(formattedWeight)}
Total Settlement: ${formatCurrency(formattedPayout)}
Handover Ref:   ${dna?.reference || certificateId}

[TRACEABILITY CHECKS]
${(dna?.checks || []).map((c) => `${c.complete ? "[PASS]" : "[    ]"} ${c.label} (+${c.points})`).join("\n")}
=====================================================
    `;
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `KabadiPassport_${certificateId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const gps = lot?.gps_lat != null && lot?.gps_lng != null
    ? `${Number(lot.gps_lat).toFixed(4)}, ${Number(lot.gps_lng).toFixed(4)}`
    : dna?.collection?.gps ? `${dna.collection.gps.lat.toFixed(4)}, ${dna.collection.gps.lng.toFixed(4)}`
    : "Not captured";

  return (
    <div className="screen pb-nav print:pb-0 print:bg-white">
      <div className="no-print">
        <Navbar title="Kabadi Passport" />
      </div>

      <main className="col px-4 pt-4 flex flex-col gap-4 print:max-w-none print:px-0">
        {/* ---- success ------------------------------------------------- */}
        <div className="rounded-xl bg-brand-50 p-3.5 flex items-center gap-3 no-print">
          <span className="w-9 h-9 shrink-0 rounded-lg bg-brand-600 text-white grid place-items-center">
            <HiCheckCircle className="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-brand-700">Sale complete</p>
            <p className="text-[12.5px] text-brand-700/75">
              {formatCurrency(formattedPayout)} recorded against this lot
            </p>
          </div>
        </div>

        {/* ---- copy switch --------------------------------------------- */}
        <div className="flex gap-1 p-1 bg-sunken rounded-xl no-print">
          {[
            { id: "collector", label: "My copy", icon: HiOutlineUser },
            { id: "buyer", label: "Depot copy", icon: HiOutlineBuildingOffice2 }
          ].map((tab) => {
            const on = activeRole === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRole(tab.id)}
                className={`flex-1 h-10 rounded-lg text-[13.5px] font-semibold tap flex items-center justify-center gap-2 transition-colors ${on ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-faint"}`}
              >
                <tab.icon className="text-base" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ---- SCRAP DNA PASSPORT 2.0 ---------------------------------- */}
        {dna && (
          <div className="rounded-[18px] bg-surface border border-line overflow-hidden shadow-[var(--shadow-card)]">
            {/* header with score */}
            <div className="bg-ink text-white p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <HiOutlineFingerPrint className="text-gold-500 text-lg" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-gold-500">Scrap DNA</p>
              </div>
              <div className="flex items-center gap-4">
                <ScoreRing score={dna.traceabilityScore} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold tracking-[-0.02em] leading-tight">
                    Kabadi Passport 2.0
                  </h2>
                  <p className="text-[13px] text-white/60 mt-1">
                    {dna.verificationLabel}
                  </p>
                  <p className="text-[11px] font-mono text-white/40 mt-1.5 truncate">
                    {dna.reference}
                  </p>
                </div>
              </div>
            </div>

            {/* material info */}
            {dna.material?.length > 0 && (
              <div className="px-5 py-3.5 border-b border-hair">
                <p className="eyebrow mb-2">Material evidence</p>
                {dna.material.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <MaterialIcon material={item} size="sm" tone="ink" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink truncate">{item.name || item.category}</p>
                      <p className="text-[11.5px] text-faint tnum">
                        {item.initialWeightKg} kg
                        {item.condition && item.condition !== "unknown" && ` · ${item.condition}`}
                        {item.classificationConfidence != null && ` · AI ${Math.round(item.classificationConfidence * 100)}%`}
                      </p>
                    </div>
                    {item.fairRange && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full tnum">
                        Fair ₹{item.fairRange.min}–{item.fairRange.max}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* weight comparison */}
            <div className="px-5 py-3.5 border-b border-hair">
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineScale className="text-faint text-sm" />
                <p className="eyebrow">Weight verification</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-sunken rounded-xl p-2.5">
                  <p className="text-[10px] text-faint uppercase tracking-wider">Initial</p>
                  <p className="font-bold text-[15px] tnum mt-0.5">{dna.weights.initialKg} kg</p>
                </div>
                <div className={`rounded-xl p-2.5 ${dna.weights.finalKg != null ? (dna.weights.mismatchPercent <= 2 ? "bg-emerald-50" : "bg-amber-50") : "bg-sunken"}`}>
                  <p className="text-[10px] text-faint uppercase tracking-wider">Final</p>
                  <p className="font-bold text-[15px] tnum mt-0.5">{dna.weights.finalKg != null ? `${dna.weights.finalKg} kg` : "—"}</p>
                </div>
                <div className="bg-sunken rounded-xl p-2.5">
                  <p className="text-[10px] text-faint uppercase tracking-wider">Drift</p>
                  <p className="font-bold text-[15px] tnum mt-0.5">{dna.weights.mismatchPercent != null ? `${dna.weights.mismatchPercent}%` : "—"}</p>
                </div>
              </div>
              <p className="text-[11px] text-faint mt-2 text-center">{dna.weights.status}</p>
            </div>

            {/* price trail */}
            <div className="px-5 py-3.5 border-b border-hair">
              <p className="eyebrow mb-2">Price trail</p>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] text-faint">Estimated value</span>
                <span className="font-semibold text-[14px] tnum">{formatCurrency(dna.price.estimatedValue || 0)}</span>
              </div>
              {dna.price.quotedPrice != null && (
                <div className="flex items-baseline justify-between gap-3 mt-1">
                  <span className="text-[12.5px] text-faint">Recycler quoted</span>
                  <span className="font-semibold text-[14px] tnum">{formatCurrency(dna.price.quotedPrice)}</span>
                </div>
              )}
              {dna.price.finalBid != null && (
                <div className="flex items-baseline justify-between gap-3 mt-1 pt-1.5 border-t border-hair">
                  <span className="text-[12.5px] text-faint">Final settled</span>
                  <span className="font-bold text-[18px] tnum text-brand-600">{formatCurrency(dna.price.finalBid)}</span>
                </div>
              )}
            </div>

            {/* collection + handover */}
            <div className="px-5 py-3.5 border-b border-hair grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <HiOutlineMapPin className="text-faint text-xs" />
                  <p className="eyebrow">Collection</p>
                </div>
                {dna.collection?.gps && (
                  <p className="text-[11px] text-faint tnum">{dna.collection.gps.lat.toFixed(4)}, {dna.collection.gps.lng.toFixed(4)}</p>
                )}
                {dna.collection?.location && <p className="text-[11.5px] text-ink mt-0.5 truncate">{dna.collection.location}</p>}
                {dna.collection?.createdAt && (
                  <p className="text-[10.5px] text-faint mt-0.5">{new Date(dna.collection.createdAt).toLocaleDateString("en-IN")}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <HiOutlineCube className="text-faint text-xs" />
                  <p className="eyebrow">Handover</p>
                </div>
                {dna.handover?.gps && (
                  <p className="text-[11px] text-faint tnum">{dna.handover.gps.lat.toFixed(4)}, {dna.handover.gps.lng.toFixed(4)}</p>
                )}
                {dna.handover?.recyclerConfirmedAt && (
                  <p className="text-[10.5px] text-faint mt-0.5">{new Date(dna.handover.recyclerConfirmedAt).toLocaleDateString("en-IN")}</p>
                )}
                {dna.handover?.signature && (
                  <p className="text-[9px] font-mono text-faint/60 mt-0.5 truncate" title="SHA-256 signature prefix">{dna.handover.signature}</p>
                )}
              </div>
            </div>

            {/* recycler */}
            {dna.recycler && (
              <div className="px-5 py-3.5 border-b border-hair flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-xl bg-sunken grid place-items-center text-[13px] font-bold text-ink">
                  {dna.recycler.name?.charAt(0) || "R"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink truncate">{dna.recycler.name}</p>
                  <p className="text-[11.5px] text-faint">
                    {dna.recycler.authorized ? "CPCB authorized" : "Authorization pending"}
                    {dna.recycler.registration && ` · ${dna.recycler.registration}`}
                  </p>
                </div>
                {dna.recycler.authorized && <HiOutlineShieldCheck className="text-emerald-600 text-lg shrink-0" />}
              </div>
            )}

            {/* destination status */}
            <div className="px-5 py-3.5 border-b border-hair">
              <p className="eyebrow mb-1.5">Destination status</p>
              <div className="flex items-center gap-2">
                {["awaiting_handover", "received_by_authorized_recycler", "sorting", "recycled"].map((step, i) => {
                  const statusOrder = { awaiting_handover: 0, received_by_authorized_recycler: 1, sorting: 2, recycled: 3 };
                  const current = statusOrder[dna.destination?.status] ?? 0;
                  const reached = i <= current;
                  return (
                    <React.Fragment key={step}>
                      <span className={`w-3 h-3 rounded-full shrink-0 ${reached ? "bg-brand-600" : "bg-line"}`} />
                      {i < 3 && <span className={`flex-1 h-0.5 ${i < current ? "bg-brand-600" : "bg-line"}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                {["Collected", "Received", "Sorting", "Recycled"].map((label) => (
                  <span key={label} className="text-[9px] text-faint">{label}</span>
                ))}
              </div>
              <p className="text-[12px] text-ink mt-2 font-medium">{dna.destination?.label}</p>
            </div>

            {/* tamper check */}
            {dna.tamperCheck && (
              <div className="px-5 py-3.5 border-b border-hair">
                <div className="flex items-center gap-2 mb-1.5">
                  <HiOutlineCamera className="text-faint text-sm" />
                  <p className="eyebrow">Tamper check</p>
                </div>
                <p className="text-[12.5px] text-ink">{dna.tamperCheck.status}</p>
                {dna.tamperCheck.score != null && (
                  <p className="text-[11.5px] text-faint mt-0.5">Evidence score: {dna.tamperCheck.score}/100</p>
                )}
                <p className="text-[10px] text-faint/60 mt-1 italic">{dna.tamperCheck.note}</p>
              </div>
            )}

            {/* traceability checklist (expandable) */}
            <div className="px-5 py-3.5">
              <button
                onClick={() => setDnaExpanded(!dnaExpanded)}
                className="flex items-center justify-between w-full tap"
              >
                <div className="flex items-center gap-2">
                  <HiOutlineDocumentCheck className="text-faint text-sm" />
                  <p className="eyebrow">Traceability checks</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold tnum text-brand-600">{dna.checks?.filter((c) => c.complete).length}/{dna.checks?.length}</span>
                  {dnaExpanded ? <HiMiniChevronUp className="text-faint" /> : <HiMiniChevronDown className="text-faint" />}
                </div>
              </button>
              {dnaExpanded && dna.checks && (
                <div className="mt-2 pt-2 border-t border-hair">
                  {dna.checks.map((check, i) => <CheckRow key={i} check={check} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- loading state for DNA ----------------------------------- */}
        {dnaLoading && !dna && (
          <Card className="text-center py-6">
            <p className="text-[13px] text-faint">Loading Scrap DNA...</p>
          </Card>
        )}

        {/* ---- formal certificate --------------------------------------- */}
        <div className="rounded-[18px] bg-surface border border-line overflow-hidden shadow-[var(--shadow-card)] print:shadow-none print:border-2">
          <div className="bg-ink text-white p-5 flex items-start gap-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white grid place-items-center p-1">
              <BrandMark className="w-full h-full" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-white/45">Ministry of Mines · SIH 26229</p>
              <h1 className="text-[17px] font-bold tracking-[-0.015em] leading-tight mt-1">
                Certificate of safe e-waste handover
              </h1>
              <p className="text-[11.5px] text-white/50 mt-1">
                E-Waste (Management) Rules, 2022
              </p>
            </div>
          </div>

          <div className="px-5 py-3 bg-sunken/50 border-b border-hair flex items-center justify-between gap-3">
            <span className="badge bg-brand-600 text-white">
              {activeRole === "collector" ? "Collector copy" : "Recycler EPR copy"}
            </span>
            <span className="text-[11px] font-mono text-faint truncate">{certificateId}</span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-hair border-b border-hair">
            <div className="p-4">
              <p className="eyebrow">Seller</p>
              <p className="font-bold text-[14px] text-ink mt-1 leading-snug">{user?.name || "Local scrap collector"}</p>
              <p className="text-[12px] text-faint tnum mt-0.5">{user?.phone ? `+91 ${user.phone}` : "—"}</p>
              <span className="badge bg-sunken text-muted mt-2">Registered collector</span>
            </div>
            <div className="p-4">
              <p className="eyebrow">Buyer</p>
              <p className="font-bold text-[14px] text-ink mt-1 leading-snug">{recycler?.name || "Authorized recycler"}</p>
              <p className="text-[12px] text-faint mt-0.5">Reg: {recycler?.registrationId || dna?.recycler?.registration || "—"}</p>
              <span className="badge bg-brand-50 text-brand-700 mt-2">Authorized</span>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-2.5">
            {[
              ["Handover date", new Date().toLocaleDateString("en-IN")],
              ["Certified net weight", formatWeight(formattedWeight)],
              ["GPS coordinates", gps]
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-faint">{label}</span>
                <span className="text-[13.5px] font-semibold text-ink tnum text-right">{value}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 pt-3 mt-1 border-t border-hair">
              <span className="text-[13px] text-faint">Settled amount</span>
              <span className="text-[22px] font-bold text-brand-600 tnum">{formatCurrency(formattedPayout)}</span>
            </div>
          </div>

          <div className="px-5 pb-5 flex items-center gap-4">
            <div className="p-2 bg-white border border-line rounded-xl shrink-0">
              <QRCodeCanvas value={payload} size={64} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <HiCheckCircle className="text-brand-600 text-base shrink-0" />
                {dna ? `Scrap DNA ${dna.traceabilityScore}/100` : "Sealed and traceable"}
              </p>
              <p className="text-[11.5px] text-faint mt-1 leading-snug">
                Valid as EPR reporting evidence and as proof of income.
              </p>
            </div>
          </div>
        </div>

        {/* ---- anomaly shield --------------------------------------------- */}
        {anomaly?.isAnomalous && <AnomalyAlert anomaly={anomaly} />}

        {/* ---- WhatsApp Digital Weight Slip Action ---- */}
        <div className="card p-3.5 bg-gradient-to-r from-emerald-50 via-surface to-[#25D366]/10 border border-emerald-300/80 no-print flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-[#25D366] text-white grid place-items-center shadow-xs shrink-0">
              <FaWhatsapp className="text-xl" />
            </span>
            <div className="min-w-0">
              <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                WhatsApp Slip
              </span>
              <h4 className="font-bold text-[14.5px] text-ink leading-tight mt-0.5">
                Digital Weight Slip
              </h4>
              <p className="text-[11.5px] text-faint truncate">
                Share verified proof of weight, payout, and green tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-[13px] font-bold flex items-center gap-1.5 tap transition-colors shrink-0 shadow-xs"
          >
            <FaWhatsapp className="text-base" />
            <span>View Slip</span>
          </button>
        </div>

        {/* ---- actions -------------------------------------------------- */}
        <div className="grid grid-cols-4 gap-2 no-print">
          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="h-10 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[12px] flex items-center justify-center gap-1 tap transition-colors shadow-2xs"
            title="Share slip on WhatsApp"
          >
            <FaWhatsapp className="text-sm" />
            <span>Slip</span>
          </button>
          <Button variant="outline" size="md" onClick={downloadCertificate} icon={HiOutlineArrowDownTray}>
            Download
          </Button>
          <Button variant="outline" size="md" onClick={handlePrint} icon={HiOutlinePrinter}>
            Print
          </Button>
          <Button variant="outline" size="md" onClick={() => {
            const tx = { materialName: lot?.materials?.map((m) => m.name).join(", ") || "Scrap", weightKg: lot?.total_weight || lot?.totalWeight || 0, totalAmount: lot?.estimated_value || lot?.estimatedValue || 0, pricePerKg: 0, handoverRef: lot?.handover_reference || certificateId, recyclerName: recycler?.name || "Recycler", status: "Paid", date: new Date().toISOString() };
            if (tx.weightKg && tx.totalAmount) tx.pricePerKg = Math.round(tx.totalAmount / tx.weightKg);
            generateInvoice(tx, user);
          }} icon={HiOutlineArrowDownTray}>
            Invoice
          </Button>
        </div>

        {/* ---- token award celebration banner ---- */}
        <div className="card p-4 bg-gradient-to-r from-gold-50 via-surface to-gold-50 border-2 border-gold-300 no-print flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-12 h-12 rounded-2xl bg-gold-500 text-ink grid place-items-center shadow-sm shrink-0">
              <HiOutlineSparkles className="text-2xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold-900">
                Handover Reward
              </p>
              <h4 className="font-extrabold text-[16px] text-ink">
                +{earnedTokensData?.totalTokens || 45} Green Tokens Earned!
              </h4>
              <p className="text-[12px] text-faint">
                Added to wallet · Redeem safety gear & mobile recharge
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            fullWidth={false}
            onClick={() => setIsRewardsModalOpen(true)}
            className="shrink-0 px-4 whitespace-nowrap"
          >
            Rewards
          </Button>
        </div>

        {/* ---- Depot Feedback / Review -------------------------------------------- */}
        {activeRole === "collector" && (
          <div className="card p-4 no-print flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-[15px] text-ink leading-snug">
                Rate this handover
              </h4>
              <p className="text-[12.5px] text-faint mt-1 leading-normal">
                Feedback on scale accuracy and turnaround helps fellow collectors
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              fullWidth={false}
              icon={HiStar}
              onClick={() => setIsRatingModalOpen(true)}
              className="shrink-0 px-4 whitespace-nowrap"
            >
              Review
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2.5 no-print mb-2">
          <Button size="lg" variant="secondary" onClick={() => navigate("/earnings")} icon={HiArrowRight}>
            View my earnings
          </Button>
          <Button size="md" variant="ghost" onClick={() => navigate("/dashboard")}>
            Back to home
          </Button>
        </div>
      </main>

      <DigitalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        lot={lot}
        recycler={recycler}
        user={user}
        certificateId={certificateId}
        tokenBonus={earnedTokensData?.totalTokens || 45}
        collectorTier="Eco Hero (+5% bonus)"
      />

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        recycler={recycler}
        lot={lot}
      />

      <RewardsModal
        isOpen={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
      />

      <div className="no-print">
        <BottomNavigation />
      </div>
    </div>
  );
};
