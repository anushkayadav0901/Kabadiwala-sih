import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getCollectorLevel, getRecyclingStreak, getEarnedBadges,
  BADGE_DEFINITIONS, getWeeklyChallenges
} from "../services/gamificationService";
import { useApp } from "../context/AppContext";
import {
  HiFire, HiOutlineTrophy, HiOutlineSparkles,
  HiChevronRight, HiCheckBadge, HiOutlineShieldCheck,
  HiOutlineBolt, HiOutlineCpuChip, HiOutlineTag,
  HiOutlineCheckCircle, HiOutlineScale
} from "react-icons/hi2";

const renderLevelIcon = (level) => {
  switch (level) {
    case 1:
      return <HiOutlineTag className="text-xl text-brand-600" />;
    case 2:
      return <HiOutlineSparkles className="text-xl text-emerald-600" />;
    case 3:
      return <HiOutlineTrophy className="text-xl text-gold-600" />;
    case 4:
      return <HiOutlineShieldCheck className="text-xl text-purple-600" />;
    default:
      return <HiOutlineSparkles className="text-xl text-brand-600" />;
  }
};

const renderBadgeIcon = (iconKey, className = "text-xl") => {
  switch (iconKey) {
    case "debut":
      return <HiOutlineSparkles className={className} />;
    case "zero_burn":
      return <HiOutlineShieldCheck className={className} />;
    case "battery":
      return <HiOutlineBolt className={className} />;
    case "pcb":
      return <HiOutlineCpuChip className={className} />;
    case "traceability":
      return <HiCheckBadge className={className} />;
    default:
      return <HiOutlineTrophy className={className} />;
  }
};

export const GamificationSection = ({ totalWeightKg = 185, onOpenRewards }) => {
  const navigate = useNavigate();
  const { language } = useApp();

  const levelInfo = getCollectorLevel(totalWeightKg);
  const streak = getRecyclingStreak();
  const earnedBadges = getEarnedBadges();
  const challenges = getWeeklyChallenges();
  const activeChallenge = challenges[0];

  const [selectedBadge, setSelectedBadge] = useState(null);

  const getLocalizedTitle = (obj) => {
    if (language === "hi" && obj.hindiTitle) return obj.hindiTitle;
    if (language === "mr" && obj.marathiTitle) return obj.marathiTitle;
    return obj.title;
  };

  return (
    <section className="flex flex-col gap-3">
      {/* Top Banner: Level & Streak */}
      <div className="card p-4 bg-gradient-to-br from-surface to-sunken border border-line">
        <div className="flex items-center justify-between gap-3">
          {/* Level Pill */}
          <div className="flex items-center gap-2.5">
            <span className="w-11 h-11 rounded-2xl bg-brand-50 grid place-items-center shadow-sm border border-brand-100">
              {renderLevelIcon(levelInfo.level)}
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
                {language === "hi" ? "लेवल" : "Tier"} {levelInfo.level}
              </span>
              <h4 className="font-bold text-[15px] text-ink leading-tight">
                {getLocalizedTitle(levelInfo)}
              </h4>
            </div>
          </div>

          {/* Streak Flame */}
          <div className="h-9 px-3 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center gap-1.5 shrink-0">
            <HiFire className="text-orange-600 text-lg animate-pulse" />
            <span className="text-[13px] font-extrabold text-orange-700 tnum">
              {streak.weeks} {language === "hi" ? "हफ्ते स्ट्रीक" : "Wk Streak"}
            </span>
          </div>
        </div>

        {/* Progress Bar to next level */}
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between text-[11.5px] mb-1.5">
            <span className="font-semibold text-muted">
              {Number(levelInfo.currentWeightKg).toFixed(1)} kg {language === "hi" ? "रीसायकल किया" : "recycled"}
            </span>
            <span className="text-faint tnum">
              {levelInfo.nextLevel ? `${levelInfo.remainingKg} kg to ${getLocalizedTitle(levelInfo.nextLevel)}` : "Max Tier Reached"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-line overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-brand-600"
            />
          </div>
        </div>

        {/* Quick Footer: Leaderboard link & Token shop */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-hair">
          <button
            onClick={() => navigate("/leaderboard")}
            className="text-[12.5px] font-semibold text-brand-600 flex items-center gap-1 tap hover:underline"
          >
            <HiOutlineTrophy className="text-sm" />
            {language === "hi" ? "लीडरबोर्ड देखें" : "Community Leaderboard"}
            <HiChevronRight className="text-xs" />
          </button>
          {onOpenRewards && (
            <button
              onClick={onOpenRewards}
              className="text-[12.5px] font-semibold text-gold-700 flex items-center gap-1 tap hover:underline"
            >
              <HiOutlineSparkles className="text-sm text-gold-600" />
              {language === "hi" ? "इनाम स्टोर" : "Rewards Store"}
            </button>
          )}
        </div>
      </div>

      {/* Badges Strip */}
      <div className="card p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[12px] font-bold text-muted uppercase tracking-wider">
            {language === "hi" ? "उपलब्धियां / बैज" : "Milestone Badges"} ({earnedBadges.length}/{BADGE_DEFINITIONS.length})
          </span>
          <span className="text-[11.5px] text-faint">Tap for info</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {BADGE_DEFINITIONS.map((badge) => {
            const isUnlocked = earnedBadges.includes(badge.id);
            return (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`w-14 shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all tap ${
                  isUnlocked
                    ? "bg-brand-50/80 border border-brand-200 text-brand-700 shadow-sm"
                    : "bg-sunken text-faint opacity-45 border border-transparent"
                }`}
                title={badge.title}
              >
                <span className="w-8 h-8 rounded-lg bg-surface grid place-items-center shadow-xs">
                  {renderBadgeIcon(badge.iconKey, isUnlocked ? "text-lg text-brand-600" : "text-lg text-faint")}
                </span>
                <span className="text-[9.5px] font-bold truncate max-w-full text-center text-ink">
                  {getLocalizedTitle(badge).split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekly Challenge Card */}
      {activeChallenge && (
        <div className="card p-3.5 bg-gold-50/50 border border-gold-200 flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-gold-500 text-ink grid place-items-center text-xl shadow-sm">
            <HiOutlineCheckCircle className="text-xl text-ink" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="badge bg-gold-200/70 text-gold-800 font-bold text-[10px]">
                Weekly Goal
              </span>
              <span className="font-extrabold text-[12.5px] text-gold-800 tnum flex items-center gap-1">
                +{activeChallenge.rewardTokens}
                <HiOutlineSparkles className="text-gold-600 text-xs" />
              </span>
            </div>
            <h5 className="font-bold text-[13.5px] text-ink mt-1 leading-tight">
              {getLocalizedTitle(activeChallenge)}
            </h5>
            <p className="text-[11.5px] text-muted mt-0.5">
              Progress: {activeChallenge.currentKg} / {activeChallenge.targetKg} kg · {activeChallenge.daysLeft} days left
            </p>
          </div>
        </div>
      )}

      {/* Badge Details Modal Dialog */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[340px] bg-surface rounded-2xl p-5 shadow-xl text-center"
          >
            <span className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto grid place-items-center mb-3 border border-brand-100 shadow-sm">
              {renderBadgeIcon(selectedBadge.iconKey, "text-3xl text-brand-600")}
            </span>
            <h4 className="font-bold text-[18px] text-ink">{getLocalizedTitle(selectedBadge)}</h4>
            <p className="text-[13px] text-muted mt-1.5 leading-snug">{selectedBadge.description}</p>
            <div className="mt-3 p-2 bg-sunken rounded-xl text-[12px] font-semibold text-faint">
              Criteria: {selectedBadge.criteria}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="btn btn-primary btn-md w-full"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};
