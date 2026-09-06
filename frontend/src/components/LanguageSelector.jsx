import React from "react";
import { HiCheck } from "react-icons/hi2";
import { LANGUAGES } from "../utils/constants";

/**
 * Language is the first real decision a user makes, so the full variant shows
 * each option set in its own script at a size that can be recognised rather
 * than read. Selection is a filled tick, not a hairline radio.
 */
export const LanguageSelector = ({ selectedLanguage, onSelect, compact = false }) => {
  if (compact) {
    return (
      <div className="flex gap-2">
        {LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.id;
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => onSelect(lang.id)}
              className={`flex-1 h-11 rounded-xl text-[14px] font-semibold border tap
                transition-[background-color,border-color,color] duration-150 ${
                  isSelected
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-surface border-line text-muted hover:bg-sunken"
                }`}
            >
              {lang.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {LANGUAGES.map((lang) => {
        const isSelected = selectedLanguage === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => onSelect(lang.id)}
            className={`w-full text-left p-4 rounded-2xl border-[1.5px] flex items-center gap-4 tap
              transition-[background-color,border-color] duration-150 ${
                isSelected
                  ? "bg-brand-50 border-brand-600"
                  : "bg-surface border-line hover:bg-sunken"
              }`}
          >
            <span
              className={`w-12 h-12 shrink-0 rounded-xl grid place-items-center text-[19px] font-bold ${
                isSelected ? "bg-brand-600 text-white" : "bg-sunken text-muted"
              }`}
              aria-hidden="true"
            >
              {lang.id === "en" ? "A" : lang.nativeName.charAt(0)}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block font-bold text-[19px] leading-tight text-ink">
                {lang.nativeName}
              </span>
              <span className="block text-[13px] text-faint mt-0.5">{lang.description}</span>
            </span>

            <span
              className={`w-6 h-6 shrink-0 rounded-full grid place-items-center border-2 ${
                isSelected ? "bg-brand-600 border-brand-600 text-white" : "border-line text-transparent"
              }`}
            >
              <HiCheck className="text-sm" />
            </span>
          </button>
        );
      })}
    </div>
  );
};
