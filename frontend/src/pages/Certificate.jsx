import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { BrandMark } from "../components/icons/Illustrations";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatWeight } from "../utils/helpers";
import { addRecyclerReview } from "../services/reviewService";
import { generateInvoice } from "../utils/generateInvoice";
import { AnomalyAlert } from "../components/AnomalyAlert";
import { FaStar } from "react-icons/fa";
import {
  HiOutlineArrowDownTray, HiOutlinePrinter, HiCheckCircle,
  HiOutlineUser, HiOutlineBuildingOffice2, HiArrowRight, HiCheck
} from "react-icons/hi2";

export const Certificate = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const { state } = useLocation();

  const certificateId = state?.certificateId || `KBC-${Date.now()}`;
  const lot = state?.lot;
  const recycler = state?.recycler;
  const anomaly = state?.anomaly;
  const initialRole = state?.viewRole || "collector"; // "collector" | "buyer"

  const [activeRole, setActiveRole] = useState(initialRole);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(["Fair Weight ⚖️", "Instant Cash ⚡"]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const formattedWeight = Number(lot?.total_weight || 10).toFixed(2);
  const formattedPayout = Number(lot?.estimated_value || 1500).toFixed(2);

  const payload = JSON.stringify({
    type: "kabadiwala-bilateral-certificate",
    certificateId,
    lotId: lot?.id,
    collectorId: user?.id,
    recyclerId: recycler?.id,
    certifiedWeightKg: formattedWeight,
    settlementAmount: formattedPayout,
    standard: "SIH26229-MoM-EPR-2026"
  });

  const availableTags = [
    "Fair Weight ⚖️",
    "Instant Cash ⚡",
    "Official EPR 🌿",
    "Respectful Staff 👍",
    "Best Price 💰"
  ];

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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

  const handlePrint = () => {
    window.print();
  };

  const downloadCertificate = () => {
    const body = `=====================================================
KABADIWALA CONNECT — DIGITAL HANDOVER CERTIFICATE
Government of India • Ministry of Mines (SIH26229)
Compliance: E-Waste (Management) Rules, 2022
=====================================================
Certificate ID: ${certificateId}
Role Copy:      ${activeRole === "collector" ? "COLLECTOR COPY (Green Passbook)" : "AUTHORIZED RECYCLER COPY (EPR Credit)"}
Date & Time:    ${new Date().toLocaleString("en-IN")}
Status:         VERIFIED & SETTLED (100% Traceable)

[PARTICIPANTS]
Collector:      ${user?.name || "Collector"} (${user?.phone ? `+91 ${user.phone}` : "phone not on file"})
Authorized Recycler: ${recycler?.name || "EcoRecycle India Hub"}
Depot Reg ID:   ${recycler?.registrationId || "Not on file"}

[MATERIAL SETTLEMENT]
Certified Weight: ${formatWeight(formattedWeight)}
Total Settlement: ${formatCurrency(formattedPayout)} (Verified 2-Decimal Settlement)
Transaction Hash: VERIF-EPR-${certificateId}
=====================================================
    `;
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificateId}_${activeRole}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const gps =
    lot?.gps_lat != null && lot?.gps_lng != null
      ? `${Number(lot.gps_lat).toFixed(4)}, ${Number(lot.gps_lng).toFixed(4)}`
      : "Not captured";

  return (
    <div className="screen pb-nav print:pb-0 print:bg-white">
      <div className="no-print">
        <Navbar title="Handover certificate" />
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
                className={`flex-1 h-10 rounded-lg text-[13.5px] font-semibold tap
                  flex items-center justify-center gap-2 transition-colors ${
                    on ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-faint"
                  }`}
              >
                <tab.icon className="text-base" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ---- certificate --------------------------------------------- */}
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

          {/* parties */}
          <div className="grid grid-cols-2 divide-x divide-hair border-b border-hair">
            <div className="p-4">
              <p className="eyebrow">Seller</p>
              <p className="font-bold text-[14px] text-ink mt-1 leading-snug">
                {user?.name || "Local scrap collector"}
              </p>
              <p className="text-[12px] text-faint tnum mt-0.5">
                {user?.phone ? `+91 ${user.phone}` : "—"}
              </p>
              <span className="badge bg-sunken text-muted mt-2">Registered collector</span>
            </div>
            <div className="p-4">
              <p className="eyebrow">Buyer</p>
              <p className="font-bold text-[14px] text-ink mt-1 leading-snug">
                {recycler?.name || "Authorized recycler"}
              </p>
              <p className="text-[12px] text-faint mt-0.5">
                Reg: {recycler?.registrationId || "Not on file"}
              </p>
              <span className="badge bg-brand-50 text-brand-700 mt-2">Authorized</span>
            </div>
          </div>

          {/* settlement */}
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
              <span className="text-[22px] font-bold text-brand-600 tnum">
                {formatCurrency(formattedPayout)}
              </span>
            </div>
          </div>

          {/* seal */}
          <div className="px-5 pb-5 flex items-center gap-4">
            <div className="p-2 bg-white border border-line rounded-xl shrink-0">
              <QRCodeCanvas value={payload} size={64} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <HiCheckCircle className="text-brand-600 text-base shrink-0" />
                Sealed and traceable
              </p>
              <p className="text-[11.5px] text-faint mt-1 leading-snug">
                Valid as EPR reporting evidence and as proof of income.
              </p>
            </div>
          </div>
        </div>

        {/* ---- anomaly shield --------------------------------------------- */}
        {anomaly?.isAnomalous && <AnomalyAlert anomaly={anomaly} />}

        {/* ---- actions -------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-2.5 no-print">
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

        {/* ---- rate the buyer -------------------------------------------- */}
        {activeRole === "collector" && (
          <Card className="no-print">
            <div className="sec-head">
              <h4 className="sec-title">Rate {recycler?.name || "this depot"}</h4>
              <FaStar className="text-gold-500" />
            </div>

            {reviewSubmitted ? (
              <div className="p-3 rounded-xl bg-brand-50 flex items-center gap-2.5">
                <HiCheckCircle className="text-brand-600 text-lg shrink-0" />
                <span className="text-[13.5px] font-medium text-brand-700">
                  Thanks — your rating helps other collectors.
                </span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="tap p-1"
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    >
                      <FaStar
                        className={`text-[28px] transition-colors ${
                          star <= rating ? "text-gold-500" : "text-line"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      data-on={selectedTags.includes(tag)}
                      className="chip tap"
                    >
                      {selectedTags.includes(tag) && <HiCheck className="text-[13px]" />}
                      {tag}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Fair weight? Quick payment?"
                  className="field text-[14px]"
                />

                <Button type="submit" size="md" variant="primary">
                  Submit rating
                </Button>
              </form>
            )}
          </Card>
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

      <div className="no-print">
        <BottomNavigation />
      </div>
    </div>
  );
};
