import React from "react";
import { NavLink } from "react-router-dom";
import {
  HiOutlineHome, HiHome,
  HiOutlineTag, HiTag,
  HiOutlineMapPin, HiMapPin,
  HiOutlineUser, HiUser,
  HiOutlineCamera, HiCamera
} from "react-icons/hi2";
import { useApp } from "../context/AppContext";

/**
 * Five flat tabs with the active one filled and marked by a top rule.
 * Scan sits in the middle and stays filled at all times — it is the one
 * action the whole product exists for, so it never fades into the row.
 */
export const BottomNavigation = () => {
  const { t } = useApp();

  const navItems = [
    { path: "/dashboard", label: t("dashboard") || "Home", icon: HiOutlineHome, active: HiHome },
    { path: "/prices", label: t("todayPrices") || "Prices", icon: HiOutlineTag, active: HiTag },
    { path: "/scan", label: t("scanItem") || "Scan", icon: HiOutlineCamera, active: HiCamera, highlight: true },
    { path: "/recyclers", label: t("nearbyRecyclers") || "Buyers", icon: HiOutlineMapPin, active: HiMapPin },
    { path: "/profile", label: t("profile") || "Profile", icon: HiOutlineUser, active: HiUser }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-hair shadow-[var(--shadow-bar)] no-print">
      <div className="col flex items-stretch safe-b">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 tap"
          >
            {({ isActive }) => {
              const on = isActive || item.highlight;
              const Glyph = isActive ? item.active : item.icon;
              return (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-brand-600" />
                  )}
                  {item.highlight ? (
                    <span
                      className={`w-9 h-9 rounded-xl grid place-items-center transition-colors ${
                        isActive ? "bg-brand-600 text-white" : "bg-ink text-white"
                      }`}
                    >
                      <Glyph className="text-[19px]" />
                    </span>
                  ) : (
                    <Glyph
                      className={`text-[22px] transition-colors ${
                        on ? "text-brand-600" : "text-faint"
                      }`}
                    />
                  )}
                  <span
                    className={`text-[10.5px] leading-none font-semibold truncate max-w-full px-0.5 transition-colors ${
                      isActive ? "text-brand-600" : "text-faint"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
