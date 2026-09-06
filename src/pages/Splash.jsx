import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { APP_NAME } from "../utils/constants";
import { useApp } from "../context/AppContext";
import { BrandMark, CollectorIllustration } from "../components/icons/Illustrations";

export const Splash = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && user.isLoggedIn) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [navigate, user]);

  return (
    <div className="min-h-[100dvh] bg-brand-600 text-white flex flex-col overflow-hidden">
      <div className="col flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <BrandMark className="w-[72px] h-[72px] ring-4 ring-white/15 rounded-[20px]" />
        </motion.div>

        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-[30px] font-bold tracking-[-0.02em] mt-6 leading-tight"
        >
          {APP_NAME}
        </motion.h1>

        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="text-[15px] text-white/70 mt-2 max-w-[26ch] leading-relaxed"
        >
          Fair rates, authorized recyclers, and proof of every handover.
        </motion.p>
      </div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="col relative"
      >
        <div className="flex justify-center opacity-90">
          <CollectorIllustration className="w-56 h-44" />
        </div>
      </motion.div>

      <div className="col px-6 pb-10 safe-b flex flex-col items-center gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
        <span className="eyebrow text-white/45">Smart India Hackathon 2026</span>
      </div>
    </div>
  );
};
