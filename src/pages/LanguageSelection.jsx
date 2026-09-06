import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LanguageSelector } from "../components/LanguageSelector";
import { Button } from "../components/Button";
import { useApp } from "../context/AppContext";
import { HiArrowRight, HiOutlineGlobeAlt } from "react-icons/hi2";

export const LanguageSelection = () => {
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useApp();

  const handleConfirm = () => {
    navigate("/dashboard");
  };

  return (
    <div className="screen flex flex-col">
      <div className="col flex-1 px-5 pt-14 pb-6">
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <span className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center">
            <HiOutlineGlobeAlt className="text-2xl" />
          </span>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-5">
            {t("selectLanguage") || "Choose your language"}
          </h1>
          <p className="text-[15px] text-muted mt-1.5">
            भाषा चुनें · भाषा निवडा
          </p>
        </motion.div>

        <div className="mt-7">
          <LanguageSelector
            selectedLanguage={language}
            onSelect={(langId) => changeLanguage(langId)}
          />
        </div>
      </div>

      <div className="col px-5 pb-8 safe-b">
        <Button onClick={handleConfirm} variant="primary" size="lg" icon={HiArrowRight}>
          Continue
        </Button>
      </div>
    </div>
  );
};
