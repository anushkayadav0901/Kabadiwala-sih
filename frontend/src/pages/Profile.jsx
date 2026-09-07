import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useApp } from "../context/AppContext";
import { logoutUser } from "../services/authService";
import { LANGUAGES, HELPLINE_NUMBER } from "../utils/constants";
import {
  HiOutlineGlobeAlt, HiOutlinePhone, HiOutlineShieldCheck,
  HiArrowRightOnRectangle, HiChevronRight, HiOutlineTrophy,
  HiFire, HiOutlineSparkles, HiOutlineStar
} from "react-icons/hi2";
import { RewardsModal } from "../components/RewardsModal";
import { getTokenBalance } from "../services/tokenService";
import { getCollectorLevel, getRecyclingStreak, getEarnedBadges } from "../services/gamificationService";

export const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser, language, t } = useApp();

  const currentLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
  const [tokenBalance, setTokenBalance] = useState(() => getTokenBalance());
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const level = getCollectorLevel(185);
  const streak = getRecyclingStreak();
  const badges = getEarnedBadges();

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate("/login");
  };

  const initials = (user?.name || "Collector")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const rows = [
    {
      icon: HiOutlineGlobeAlt,
      title: "Language / भाषा",
      value: currentLangObj.nativeName,
      onClick: () => navigate("/language-selection"),
      action: "Change"
    },
    {
      icon: HiOutlineShieldCheck,
      title: "Safety rules",
      value: "Handling hazardous material",
      onClick: () => navigate("/safety"),
      action: null
    }
  ];

  return (
    <div className="screen pb-nav">
      <Navbar title={t("profile") || "My profile"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- identity ------------------------------------------------- */}
        <section className="card p-5 flex items-center gap-4">
          <span className="w-16 h-16 shrink-0 rounded-2xl bg-brand-600 text-white grid place-items-center
                           font-bold text-[22px] tracking-tight">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-bold tracking-[-0.015em] leading-tight truncate">
              {user?.name || "Collector"}
            </h2>
            <p className="text-[13.5px] text-muted tnum mt-0.5">
              +91 {user?.phone || "—"}
            </p>
            <span className="badge bg-brand-50 text-brand-700 mt-2">Registered collector</span>
          </div>
        </section>

        {/* ---- digital tokens & gamification card ----------------------- */}
        <section className="card p-4 bg-gradient-to-br from-gold-50/60 to-surface border border-gold-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-gold-100 text-gold-700 grid place-items-center">
                <HiOutlineSparkles className="text-xl" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold-800">
                  Kabadi Tokens
                </span>
                <p className="text-[22px] font-extrabold text-ink tnum leading-tight">
                  {tokenBalance} <span className="text-[13px] font-medium text-faint">Tokens</span>
                </p>
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={() => setIsRewardsOpen(true)}>
              Redeem Rewards
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-gold-200/60 text-center">
            <div className="bg-surface/80 p-2 rounded-xl border border-line">
              <span className="text-[11px] font-bold text-faint block uppercase">Tier</span>
              <span className="text-[13.5px] font-bold text-brand-700 block mt-0.5 truncate">
                Level {level.level}
              </span>
            </div>
            <div className="bg-surface/80 p-2 rounded-xl border border-line">
              <span className="text-[11px] font-bold text-faint block uppercase">Streak</span>
              <span className="text-[13.5px] font-bold text-orange-600 block mt-0.5 flex items-center justify-center gap-1">
                <HiFire className="text-sm" /> {streak.weeks} wks
              </span>
            </div>
            <div
              onClick={() => navigate("/leaderboard")}
              className="bg-surface/80 p-2 rounded-xl border border-line cursor-pointer tap hover:bg-sunken"
            >
              <span className="text-[11px] font-bold text-faint block uppercase">Leaderboard</span>
              <span className="text-[13.5px] font-bold text-ink block mt-0.5 flex items-center justify-center gap-1">
                <HiOutlineTrophy className="text-gold-600 text-sm" /> #4
              </span>
            </div>
          </div>
        </section>

        {/* ---- settings ---------------------------------------------------- */}
        <Card padding="p-0" className="divide-y divide-hair overflow-hidden">
          {rows.map((row) => (
            <button
              key={row.title}
              onClick={row.onClick}
              className="w-full p-4 flex items-center gap-3 text-left tap
                         hover:bg-sunken/50 active:bg-sunken transition-colors"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-sunken text-ink grid place-items-center">
                <row.icon className="text-lg" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink">{row.title}</span>
                <span className="block text-[12.5px] text-faint truncate">{row.value}</span>
              </span>
              {row.action ? (
                <span className="badge bg-brand-50 text-brand-700 shrink-0">{row.action}</span>
              ) : (
                <HiChevronRight className="text-faint shrink-0" />
              )}
            </button>
          ))}

          <a
            href={`tel:${HELPLINE_NUMBER}`}
            className="w-full p-4 flex items-center gap-3 tap
                       hover:bg-sunken/50 active:bg-sunken transition-colors"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl bg-sunken text-ink grid place-items-center">
              <HiOutlinePhone className="text-lg" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-ink">Support helpline</span>
              <span className="block text-[12.5px] text-faint tnum">{HELPLINE_NUMBER}</span>
            </span>
            <span className="badge bg-gold-50 text-gold-700 shrink-0">Toll free</span>
          </a>
        </Card>

        {/* ---- log out ------------------------------------------------------ */}
        <Button
          onClick={handleLogout}
          variant="danger"
          size="lg"
          icon={HiArrowRightOnRectangle}
        >
          {t("logout") || "Log out"}
        </Button>

        <p className="text-[12px] text-faint text-center mt-1">
          Kabadiwala Connect · SIH 26229
        </p>
      </main>

      <RewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        onBalanceChange={setTokenBalance}
      />

      <BottomNavigation />
    </div>
  );
};
