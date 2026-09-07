/**
 * GamificationSection.jsx — Refined & Native
 * Fully aligned with Kabadiwala Connect's design language:
 * - Collector Level 2 as subtle status eyebrow
 * - Eco Hero as primary card title with quiet +5% bonus perk
 * - 185 kg as strongest numerical element with tabular alignment
 * - Solid emerald progression bar (no AI-style blue-to-green gradients)
 * - Practical weekly challenge with direct camera record action
 * - Simple outlined badge chips (First Collection, Zero-Burn Champion)
 * - Low-prominence secondary "+3 to unlock" action
 * - Crisp white surface that defers to the primary purple camera CTA
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCollectorLevel, getEarnedBadges,
  BADGE_DEFINITIONS, getWeeklyChallenges
} from "../services/gamificationService";
import { useApp } from "../context/AppContext";
import {
  HiOutlineSparkles, HiOutlineShieldCheck,
  HiOutlineCamera, HiOutlineXMark, HiArrowRight
} from "react-icons/hi2";

export const GamificationSection = ({ totalWeightKg = 185 }) => {
  const navigate = useNavigate();
  const { language } = useApp();

  const levelInfo       = getCollectorLevel(totalWeightKg);
  const earnedBadges    = getEarnedBadges();
  const challenges      = getWeeklyChallenges();
  const activeChallenge = challenges[0];
  const [selectedBadge, setSelectedBadge] = useState(null);

  const loc = (obj) => {
    if (!obj) return "";
    if (language === "hi" && obj.hindiTitle)   return obj.hindiTitle;
    if (language === "mr" && obj.marathiTitle) return obj.marathiTitle;
    return obj.title;
  };

  const challengePct = activeChallenge
    ? Math.min(100, Math.round(
        ((activeChallenge.currentKg ?? activeChallenge.currentCount ?? 0) /
         (activeChallenge.targetKg  ?? activeChallenge.targetCount  ?? 1)) * 100))
    : 0;

  // Find earned badge objects for display
  const earnedBadgeList = BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.id));
  const remainingCount = BADGE_DEFINITIONS.length - earnedBadgeList.length;

  return (
    <>
      <section className="card p-4 sm:p-5 overflow-hidden border border-line shadow-xs">
        {/* ── Top Header & Hero Progress ────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              {language === "hi" ? "कबाड़ी स्तर 2" : "Collector Level 2"}
            </p>
            <h3 className="text-[20px] font-bold text-ink tracking-tight mt-1 flex items-center gap-2 leading-tight">
              <span>{loc(levelInfo)}</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                +5% bonus
              </span>
            </h3>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[24px] font-black text-ink tnum leading-tight block">
              {Number(levelInfo.currentWeightKg).toFixed(0)} kg
            </span>
            <span className="text-[11.5px] text-faint block mt-0.5">
              {language === "hi" ? "कुल रीसायकल" : "scrap recycled"}
            </span>
          </div>
        </div>

        {/* Progress Bar towards next tier — Solid sustainability emerald */}
        <div className="mt-3.5">
          <div className="h-2 rounded-full bg-line/80 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-emerald-600"
            />
          </div>
          <div className="flex justify-between items-baseline text-[11.5px] mt-1.5">
            <span className="text-faint tnum">
              Level {levelInfo.level} (100 kg)
            </span>
            <span className="font-semibold text-ink tnum">
              {levelInfo.nextLevel
                ? `${levelInfo.remainingKg} kg → ${loc(levelInfo.nextLevel)} (+10%)`
                : (language === "hi" ? "सर्वोच्च स्तर" : "Max tier reached")}
            </span>
          </div>
        </div>

        {/* ── Practical Weekly Challenge ────────────────────────────── */}
        {activeChallenge && (
          <div className="mt-3.5 p-3 rounded-xl bg-sunken/70 border border-line/70">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="eyebrow">
                  {language === "hi" ? "साप्ताहिक लक्ष्य" : "Weekly Goal"}
                </span>
                <span className="text-[11px] font-semibold text-gold-700 bg-gold-50 border border-gold-200/80 px-1.5 py-0.2 rounded tnum">
                  +{activeChallenge.rewardTokens} tokens
                </span>
              </div>
              <span className="text-[11px] font-medium text-faint tnum">
                {activeChallenge.daysLeft}d left
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-2 min-w-0">
                <HiOutlineCamera className="text-brand-600 text-[15px] shrink-0" />
                <p className="text-[13px] font-semibold text-ink truncate">
                  {loc(activeChallenge)}
                </p>
              </div>
              <button
                onClick={() => navigate("/scan")}
                className="text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 shrink-0 inline-flex items-center gap-0.5 tap"
                title="Photograph & record this scrap"
              >
                <span>Record</span>
                <HiArrowRight className="text-[10px]" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <div className="h-1.5 flex-1 rounded-full bg-line overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${challengePct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                  className="h-full rounded-full bg-emerald-600"
                />
              </div>
              <span className="text-[11px] font-semibold text-muted tnum shrink-0">
                {activeChallenge.currentKg ?? activeChallenge.currentCount ?? 0} /{" "}
                {activeChallenge.targetKg ?? activeChallenge.targetCount} kg
              </span>
            </div>
          </div>
        )}

        {/* ── Simplified Named Badges Line ──────────────────────────── */}
        <div className="mt-3.5 pt-3 border-t border-hair flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="eyebrow mr-0.5">
              {language === "hi" ? "बैज" : "Badges"}:
            </span>
            {earnedBadgeList.slice(0, 2).map((badge) => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink bg-surface px-2.5 py-1 rounded-lg border border-line shadow-2xs hover:bg-sunken hover:border-line/90 transition-colors tap"
              >
                {badge.iconKey === "zero_burn" ? (
                  <HiOutlineShieldCheck className="text-emerald-600 text-[13.5px] shrink-0" />
                ) : (
                  <HiOutlineSparkles className="text-emerald-600 text-[13px] shrink-0" />
                )}
                <span>{loc(badge)}</span>
              </button>
            ))}
          </div>

          {remainingCount > 0 && (
            <button
              onClick={() => navigate("/profile")}
              className="text-[11.5px] font-medium text-faint hover:text-ink transition-colors tap shrink-0 flex items-center gap-0.5"
            >
              <span>+{remainingCount} to unlock</span>
              <HiArrowRight className="text-[10px]" />
            </button>
          )}
        </div>
      </section>

      {/* ── Badge detail modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
              onClick={() => setSelectedBadge(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="relative w-full max-w-[440px] bg-surface rounded-t-[24px]
                         p-5 shadow-[var(--shadow-sheet)] pb-safe"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 grid place-items-center">
                    {selectedBadge.iconKey === "zero_burn" ? (
                      <HiOutlineShieldCheck className="text-xl text-emerald-600" />
                    ) : (
                      <HiOutlineSparkles className="text-xl text-emerald-600" />
                    )}
                  </span>
                  <div>
                    <h4 className="text-[16px] font-bold text-ink leading-tight">
                      {loc(selectedBadge)}
                    </h4>
                    <span className="badge bg-emerald-50 text-emerald-700 text-[10px] mt-0.5">
                      {language === "hi" ? "प्राप्त हुआ" : "Earned Badge"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="w-8 h-8 rounded-full bg-sunken text-muted grid place-items-center tap"
                >
                  <HiOutlineXMark className="text-base" />
                </button>
              </div>

              <p className="text-[13px] text-muted leading-relaxed mb-3">
                {selectedBadge.description}
              </p>

              <div className="p-2.5 rounded-xl bg-sunken text-[12px] flex items-center justify-between text-faint">
                <span>{language === "hi" ? "शर्त" : "Criteria"}:</span>
                <span className="font-semibold text-ink">{selectedBadge.criteria}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
