import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { useApp } from "../context/AppContext";
import { LANGUAGES } from "../utils/constants";
import { BrandMark } from "./icons/Illustrations";

/**
 * Compact app bar — 56px, white, hairline base. On the home screen it shows
 * the wordmark; everywhere else the back control takes the leading slot and
 * the screen title sits beside it, so a user always knows where they are.
 */
export const Navbar = ({ title = null, showBack = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, changeLanguage, bagItems, isOnline } = useApp();

  const isHome = location.pathname === "/dashboard" || location.pathname === "/";
  const currentLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
  const bagCount = bagItems?.length || 0;

  const cycleLanguage = () => {
    const currentIndex = LANGUAGES.findIndex((l) => l.id === language);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    changeLanguage(LANGUAGES[nextIndex].id);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-hair no-print">
      <div className="col h-14 px-3 flex items-center gap-2">
        {showBack && !isHome ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 -ml-1 shrink-0 grid place-items-center rounded-full text-ink
                       hover:bg-sunken active:bg-sunken tap transition-colors"
            aria-label="Go back"
          >
            <FaChevronLeft className="text-base" />
          </button>
        ) : (
          <BrandMark className="w-9 h-9 shrink-0 ml-1" />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-[17px] leading-tight tracking-[-0.01em] truncate">
            {title || "Kabadiwala Connect"}
          </h1>
          {isHome && (
            <p className="text-[11px] font-medium text-faint leading-tight truncate">
              Fair rates · Authorized recyclers
            </p>
          )}
        </div>

        <button
          onClick={cycleLanguage}
          className="h-9 px-3 shrink-0 rounded-full border border-line text-[13px] font-semibold
                     text-ink hover:bg-sunken active:bg-sunken tap transition-colors"
          title="Change language"
        >
          {currentLangObj.nativeName}
        </button>

        <button
          onClick={() => navigate("/bag")}
          className="relative w-10 h-10 shrink-0 grid place-items-center rounded-full text-ink
                     hover:bg-sunken active:bg-sunken tap transition-colors"
          aria-label={`Scrap bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
        >
          <HiOutlineShoppingBag className="text-[21px]" />
          {bagCount > 0 && (
            <span
              className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full
                         bg-brand-600 text-white text-[10px] font-bold tnum
                         grid place-items-center ring-2 ring-surface"
            >
              {bagCount}
            </span>
          )}
        </button>
      </div>
      {!isOnline && (
        <div className="bg-gold-500 text-ink text-[11.5px] font-semibold text-center py-1 px-3">
          You're offline — scans and saved data still work
        </div>
      )}
    </header>
  );
};
