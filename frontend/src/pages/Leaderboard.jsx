import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { getCommunityLeaderboard, getRecyclingStreak } from "../services/gamificationService";
import { getTokenBalance } from "../services/tokenService";
import { useApp } from "../context/AppContext";
import {
  HiFire, HiOutlineTrophy, HiOutlineSparkles,
  HiOutlineShieldCheck
} from "react-icons/hi2";

export const Leaderboard = () => {
  const navigate = useNavigate();
  const { user: currentUser, language } = useApp();
  const [leaderboard] = useState(() => getCommunityLeaderboard());
  const streak = getRecyclingStreak();
  const userTokens = getTokenBalance();

  const userName = currentUser?.name || "Santosh Yadav";
  const userInitials = (currentUser?.name || "S")[0].toUpperCase();

  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <div className="screen pb-nav">
      <Navbar title={language === "hi" ? "कबाड़ी लीडरबोर्ड" : language === "mr" ? "कबाडी लीडरबोर्ड" : "Recycler Leaderboard"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* Banner */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <div className="flex items-center gap-2 text-gold-400">
            <HiOutlineTrophy className="text-xl shrink-0" />
            <span className="text-[12px] font-bold uppercase tracking-wider">
              {language === "hi" ? "मासिक क्षेत्रीय रैंकिंग" : "Regional Clean Champions"}
            </span>
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.015em] mt-1.5 leading-tight">
            {language === "hi" ? "पर्यावरण रक्षक लीडरबोर्ड" : "Top Formal Recyclers"}
          </h2>
          <p className="text-[12.5px] text-white/60 mt-1 leading-snug">
            {language === "hi"
              ? "अधिकृत रीसाइक्लिंग द्वारा पर्यावरण बचाने वाले शीर्ष कबाड़ी साथी।"
              : "Ranked by verified e-waste diverted to authorized formal recycling channels."}
          </p>

          {/* User's Current Position */}
          <div className="mt-4 p-3 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-brand-500 text-white font-extrabold text-[14px] grid place-items-center">
                #4
              </span>
              <div>
                <p className="text-[13.5px] font-bold text-white leading-tight">
                  {userName}
                </p>
                <p className="text-[11px] text-white/55">Rank #4 · Green Aggregator</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-extrabold text-[15px] text-gold-400 tnum flex items-center justify-end gap-1">
                <HiOutlineSparkles className="text-gold-400 text-xs" />
                {userTokens}
              </p>
              <p className="text-[11px] text-white/55">185 kg recycled</p>
            </div>
          </div>
        </section>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-1">
          {/* #2 */}
          <div className="card p-3 flex flex-col items-center text-center bg-sunken/40 border border-line">
            <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[12px] grid place-items-center mb-1.5 shadow-xs border border-slate-300">
              2
            </span>
            <div className={`w-10 h-10 rounded-full ${top3[1].avatarBg} grid place-items-center font-bold text-sm mb-1.5 shadow-sm`}>
              {top3[1].name.split(" ")[0][0]}
            </div>
            <p className="font-bold text-[12.5px] text-ink truncate max-w-full leading-tight">{top3[1].name.split(" ")[0]}</p>
            <p className="text-[10px] text-faint truncate">{top3[1].area.split(",")[0]}</p>
            <span className="badge bg-sunken text-muted font-bold text-[10px] mt-2 tnum">
              {top3[1].weightKg} kg
            </span>
          </div>

          {/* #1 Champion */}
          <div className="card p-3.5 flex flex-col items-center text-center bg-gradient-to-b from-gold-50/70 to-surface border-2 border-gold-400 shadow-md -translate-y-2">
            <span className="w-8 h-8 rounded-full bg-gold-400 text-ink font-extrabold text-[14px] grid place-items-center mb-1.5 shadow-sm border border-gold-500">
              <HiOutlineTrophy className="text-base" />
            </span>
            <div className={`w-12 h-12 rounded-full ${top3[0].avatarBg} grid place-items-center font-bold text-base mb-1.5 shadow`}>
              {top3[0].name.split(" ")[0][0]}
            </div>
            <p className="font-extrabold text-[13.5px] text-ink truncate max-w-full leading-tight">{top3[0].name.split(" ")[0]}</p>
            <p className="text-[10px] text-gold-700 font-semibold truncate">{top3[0].area.split(",")[0]}</p>
            <span className="badge bg-gold-500 text-ink font-extrabold text-[11px] mt-2 tnum shadow-sm">
              {top3[0].weightKg} kg
            </span>
          </div>

          {/* #3 */}
          <div className="card p-3 flex flex-col items-center text-center bg-sunken/40 border border-line">
            <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[12px] grid place-items-center mb-1.5 shadow-xs border border-amber-300">
              3
            </span>
            <div className={`w-10 h-10 rounded-full ${top3[2].avatarBg} grid place-items-center font-bold text-sm mb-1.5 shadow-sm`}>
              {top3[2].name.split(" ")[0][0]}
            </div>
            <p className="font-bold text-[12.5px] text-ink truncate max-w-full leading-tight">{top3[2].name.split(" ")[0]}</p>
            <p className="text-[10px] text-faint truncate">{top3[2].area.split(",")[0]}</p>
            <span className="badge bg-sunken text-muted font-bold text-[10px] mt-2 tnum">
              {top3[2].weightKg} kg
            </span>
          </div>
        </div>

        {/* Leaderboard Table List */}
        <section className="card divide-y divide-hair overflow-hidden border border-line">
          {leaderboard.map((user) => (
            <div
              key={user.rank}
              className={`p-3.5 flex items-center gap-3 transition-colors ${
                user.isCurrentUser ? "bg-brand-50/80 border-l-4 border-l-brand-600" : ""
              }`}
            >
              {/* Rank */}
              <span className={`w-7 text-center font-extrabold text-[14px] ${
                user.rank === 1 ? "text-gold-600" : user.rank === 2 ? "text-slate-500" : user.rank === 3 ? "text-amber-700" : "text-faint"
              }`}>
                #{user.rank}
              </span>

              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl ${user.avatarBg} grid place-items-center font-bold text-[13px] shrink-0`}>
                {user.isCurrentUser ? userInitials : user.name.split(" ")[0][0]}
              </div>

              {/* Name & Area */}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[14px] text-ink truncate flex items-center gap-1.5">
                  <span>{user.isCurrentUser ? `${userName} (You)` : user.name}</span>
                  {user.isCurrentUser && (
                    <span className="badge bg-brand-600 text-white font-bold text-[9.5px]">YOU</span>
                  )}
                </p>
                <p className="text-[11.5px] text-faint truncate">
                  {user.isCurrentUser && currentUser?.city ? currentUser.city : user.area} · <span className="text-muted font-medium">{user.level.split("·")[1]?.trim()}</span>
                </p>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <p className="font-extrabold text-[14.5px] text-ink tnum">{user.weightKg} kg</p>
                <p className="text-[11.5px] font-bold text-gold-700 tnum flex items-center justify-end gap-1">
                  <HiOutlineSparkles className="text-gold-600 text-xs" />
                  {user.tokensEarned}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Motivational Footer */}
        <div className="card p-3.5 bg-brand-50/60 border border-brand-200 flex items-center gap-3 mb-4">
          <span className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center text-lg shrink-0">
            <HiFire />
          </span>
          <div className="min-w-0 flex-1 text-[12.5px] text-brand-900 leading-snug">
            <span className="font-bold block">Keep your streak alive!</span>
            Recycle scrap this week to earn +50 bonus tokens and climb the ranks.
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};
