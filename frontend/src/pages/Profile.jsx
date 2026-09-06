import React from "react";
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
  HiArrowRightOnRectangle, HiChevronRight
} from "react-icons/hi2";

export const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser, language, t } = useApp();

  const currentLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

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
          <div className="min-w-0">
            <h2 className="text-[19px] font-bold tracking-[-0.015em] leading-tight truncate">
              {user?.name || "Collector"}
            </h2>
            <p className="text-[13.5px] text-muted tnum mt-0.5">
              +91 {user?.phone || "—"}
            </p>
            <span className="badge bg-brand-50 text-brand-700 mt-2">Registered collector</span>
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

      <BottomNavigation />
    </div>
  );
};
