import React from "react";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { mockSafetyTips } from "../data/mockData";
import { SafetyIcon, safetyGlyphFor } from "../components/icons/Illustrations";
import { useApp } from "../context/AppContext";
import { HiOutlineShieldCheck, HiOutlineSpeakerWave } from "react-icons/hi2";

export const SafetyGuide = () => {
  const { language, t } = useApp();

  const getLocalizedTitle = (tip) => {
    if (language === "hi" && tip.hindiTitle) return tip.hindiTitle;
    if (language === "mr" && tip.marathiTitle) return tip.marathiTitle;
    return tip.title;
  };

  const speakTip = (tip) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    const speech = new SpeechSynthesisUtterance(`${getLocalizedTitle(tip)}. ${tip.description}`);
    speech.lang = locale;
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="screen pb-nav">
      <Navbar title={t("safetyGuide") || "Safety rules"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        <section className="rounded-[18px] bg-ink text-white p-5 flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-alert-500 grid place-items-center">
            <HiOutlineShieldCheck className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-white/50">Four rules</p>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] leading-tight mt-1">
              Handle it safely
            </h2>
            <p className="text-[13px] text-white/60 mt-1.5 leading-snug">
              The pictures say the rule — you don't need to read the words.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-2.5">
          {mockSafetyTips.map((tip) => (
            <div key={tip.id} className="card p-4 flex items-start gap-4">
              <span className="w-16 h-16 shrink-0 rounded-2xl bg-sunken grid place-items-center">
                <SafetyIcon name={safetyGlyphFor(tip.id)} className="w-11 h-11" />
              </span>
              <div className="min-w-0 pt-0.5 flex-1">
                <div className="flex items-start gap-2">
                  <h3 className="font-bold text-[17px] leading-snug text-ink flex-1">
                    {getLocalizedTitle(tip)}
                  </h3>
                  <button onClick={() => speakTip(tip)} className="w-10 h-10 -mt-1 shrink-0 rounded-xl bg-brand-50 text-brand-700 grid place-items-center tap" aria-label={`Listen to ${getLocalizedTitle(tip)}`}>
                    <HiOutlineSpeakerWave className="text-lg" />
                  </button>
                </div>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};
