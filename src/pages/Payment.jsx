import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatWeight } from "../utils/helpers";
import { createTransaction, confirmHandover } from "../services/transactionService";
import { updateLotStatus, updateTraceabilityStatus } from "../services/lotService";
import {
  HiOutlineBanknotes, HiOutlineDevicePhoneMobile, HiOutlineBuildingLibrary,
  HiOutlineSpeakerWave, HiCheckCircle, HiOutlineLockClosed,
  HiOutlineExclamationCircle
} from "react-icons/hi2";

export const Payment = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useApp();

  const lot = state?.lot;
  const recycler = state?.recycler;

  const [method, setMethod] = useState("upi"); // "upi" | "cash" | "bank"
  const [upiApp, setUpiApp] = useState("phonepe"); // "phonepe" | "gpay" | "paytm" | "bhim"
  const [soundboxEnabled, setSoundboxEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState("");

  const payableAmount = Number(lot?.estimated_value || 1500).toFixed(2);
  const lotWeight = Number(lot?.total_weight || 10).toFixed(2);

  // Cash denomination breakdown calculation
  const getDenominations = (total) => {
    let remaining = Math.floor(Number(total));
    const d500 = Math.floor(remaining / 500);
    remaining %= 500;
    const d200 = Math.floor(remaining / 200);
    remaining %= 200;
    const d100 = Math.floor(remaining / 100);
    remaining %= 100;
    const d50 = Math.floor(remaining / 50);
    remaining %= 50;
    const coins = remaining + (Number(total) - Math.floor(Number(total)));
    return { d500, d200, d100, d50, coins: Number(coins.toFixed(2)) };
  };

  const denominations = getDenominations(payableAmount);

  // Play synthetic tone & speech announcement
  const playSoundboxAnnouncement = (amount) => {
    if (!soundboxEnabled) return;
    try {
      // Audio Chime using Web Audio API
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);

      // Speech Synthesizer Voice Announcement
      if ("speechSynthesis" in window) {
        const text = `Received ${amount} rupees on ${upiApp.toUpperCase()}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Audio fallback silent
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3A34D4", "#F0A020", "#0F1424"]
      });
    } catch {}
  };

  const handlePay = async () => {
    if (!lot || !recycler?.id || !user?.id) {
      return setError("Missing lot or recycler details. Please restart the sale.");
    }

    setProcessing(true);
    setError("");

    try {
      setProcessingStep("Recording settlement…");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep("Updating lot status…");
      await new Promise((r) => setTimeout(r, 650));

      setProcessingStep("Issuing handover record…");
      const handoverRef = state?.certificateId || `HO-${Date.now()}`;

      const transaction = await createTransaction({
        lotId: lot.id,
        recyclerId: recycler.id,
        quotedPrice: payableAmount,
        finalPrice: payableAmount,
        handoverRef
      });

      const paid = await confirmHandover(transaction.id, payableAmount);
      await updateLotStatus(lot.id, "paid");
      await updateTraceabilityStatus(lot.id, "paid");

      // Signal Soundbox & Confetti
      if (method === "upi") {
        playSoundboxAnnouncement(payableAmount);
      }
      triggerConfetti();

      // Brief delay to let the user enjoy the celebration
      setTimeout(() => {
        navigate("/certificate", {
          state: {
            lot,
            recycler,
            transaction: paid,
            certificateId: handoverRef,
            method,
            settledAmount: payableAmount,
            viewRole: "collector"
          }
        });
      }, 1000);
    } catch (err) {
      setError(err.message || "Could not record the settlement");
      setProcessing(false);
    }
  };

  const methods = [
    { id: "cash", name: "Cash", icon: HiOutlineBanknotes },
    { id: "upi", name: "UPI", icon: HiOutlineDevicePhoneMobile },
    { id: "bank", name: "Bank", icon: HiOutlineBuildingLibrary }
  ];

  return (
    <div className="screen pb-bar">
      <Navbar title="Settlement" />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- amount --------------------------------------------------- */}
        <section className="rounded-[18px] bg-ink text-white p-5 text-center">
          <p className="eyebrow text-white/50">Amount due to you</p>
          <p className="font-bold text-[42px] tnum tracking-[-0.03em] leading-none mt-2">
            {formatCurrency(payableAmount)}
          </p>
          <p className="text-[13px] text-white/60 mt-2.5">
            {formatWeight(lotWeight)} · {recycler?.name || "Authorized buyer"}
          </p>
        </section>

        {/* ---- method --------------------------------------------------- */}
        <section>
          <p className="eyebrow mb-2">How are you being paid?</p>
          <div className="grid grid-cols-3 gap-2.5">
            {methods.map((m) => {
              const isSelected = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`h-[76px] rounded-xl border-[1.5px] flex flex-col items-center
                    justify-center gap-1.5 tap transition-[background-color,border-color] duration-150 ${
                      isSelected
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-line bg-surface text-muted hover:bg-sunken"
                    }`}
                >
                  <m.icon className="text-[22px]" />
                  <span className="text-[13px] font-semibold">{m.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- cash ------------------------------------------------------ */}
        {method === "cash" && (
          <Card>
            <div className="sec-head">
              <h4 className="sec-title">Notes to count</h4>
              <span className="text-[13px] font-bold tnum">{formatCurrency(payableAmount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["₹500", denominations.d500],
                ["₹200", denominations.d200],
                ["₹100", denominations.d100],
                ["₹50", denominations.d50]
              ].map(([note, count]) => (
                <div
                  key={note}
                  className={`p-3 rounded-xl flex items-baseline justify-between ${
                    count > 0 ? "bg-gold-50" : "bg-sunken"
                  }`}
                >
                  <span className={`text-[13px] font-semibold ${count > 0 ? "text-gold-700" : "text-faint"}`}>
                    {note}
                  </span>
                  <span className={`font-bold text-[17px] tnum ${count > 0 ? "text-ink" : "text-faint"}`}>
                    ×{count}
                  </span>
                </div>
              ))}
            </div>
            {denominations.coins > 0 && (
              <p className="text-[13px] text-muted mt-3 tnum">
                Plus <span className="font-bold text-ink">₹{denominations.coins}</span> in change.
              </p>
            )}
            <p className="text-[12.5px] text-faint mt-3">
              Count the notes before you leave the counter. Cash needs no app.
            </p>
          </Card>
        )}

        {/* ---- upi ------------------------------------------------------- */}
        {method === "upi" && (
          <Card>
            <div className="sec-head">
              <h4 className="sec-title">Choose your UPI app</h4>
              <span className="badge bg-brand-50 text-brand-700">No fee</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "phonepe", label: "PhonePe" },
                { id: "gpay", label: "GPay" },
                { id: "paytm", label: "Paytm" },
                { id: "bhim", label: "BHIM" }
              ].map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setUpiApp(app.id)}
                  className={`h-12 rounded-xl border text-[12.5px] font-semibold tap
                    transition-[background-color,border-color,color] duration-150 ${
                      upiApp === app.id
                        ? "bg-ink border-ink text-white"
                        : "bg-surface border-line text-muted hover:bg-sunken"
                    }`}
                >
                  {app.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-hair">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-sunken text-ink grid place-items-center">
                <HiOutlineSpeakerWave className="text-base" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink">Say the amount out loud</p>
                <p className="text-[12px] text-faint">Confirms the payment without reading</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundboxEnabled}
                onClick={() => setSoundboxEnabled(!soundboxEnabled)}
                className={`w-12 h-7 shrink-0 rounded-full p-0.5 tap transition-colors ${
                  soundboxEnabled ? "bg-brand-600" : "bg-line"
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    soundboxEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </Card>
        )}

        {/* ---- bank ------------------------------------------------------ */}
        {method === "bank" && (
          <Card>
            <h4 className="sec-title mb-3">Bank transfer</h4>
            <div className="flex items-baseline justify-between gap-3 py-2 border-b border-hair">
              <span className="text-[13px] text-faint">Beneficiary</span>
              <span className="text-[14px] font-semibold text-ink">{user?.name || "Collector"}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-[13px] text-faint">Account</span>
              <span className="text-[14px] text-faint">Not added yet</span>
            </div>
            <p className="text-[12.5px] text-muted mt-2 p-3 rounded-xl bg-sunken leading-snug">
              No bank account is on file for this collector. Add one in your profile before
              choosing bank transfer, or take the payment in cash.
            </p>
          </Card>
        )}

        {/* ---- honesty note --------------------------------------------- */}
        <div className="flex items-start gap-2.5 px-1">
          <HiOutlineLockClosed className="text-faint text-base shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-faint leading-snug">
            This records what the depot paid you. No money moves through the app — cash stays
            the default and digital payment is always optional.
          </p>
        </div>

        {error && (
          <p className="text-[13px] font-medium text-alert-600 flex items-center gap-1.5 px-1">
            <HiOutlineExclamationCircle className="text-base shrink-0" />
            {error}
          </p>
        )}

        {processing && (
          <div className="card p-4 flex items-center gap-3">
            <span className="w-5 h-5 shrink-0 rounded-full border-2 border-brand-100 border-t-brand-600 animate-spin" />
            <span className="text-[13.5px] font-medium text-muted">{processingStep}</span>
          </div>
        )}
      </main>

      <div className="actionbar">
        <div className="col">
          <Button
            size="lg"
            variant="primary"
            onClick={handlePay}
            loading={processing}
            icon={HiCheckCircle}
          >
            {processing ? "Recording…" : `Confirm ${formatCurrency(payableAmount)} received`}
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
