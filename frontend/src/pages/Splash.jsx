import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { BrandMark } from "../components/icons/Illustrations";

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
    <div className="min-h-[100dvh] bg-surface flex flex-col">
      <div className="col flex-1 flex flex-col items-center justify-center px-8">
        {/* The lockup carries the wordmark and tagline, so it gets the screen
            to itself rather than competing with a heading. */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <BrandMark variant="full" className="w-[268px] h-auto" />
        </motion.div>
      </div>

      <div className="col px-6 pb-12 safe-b flex flex-col items-center gap-4">
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-600"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
        <span className="eyebrow">Smart India Hackathon 2026</span>
      </div>
    </div>
  );
};
