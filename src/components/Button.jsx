import React from "react";
import { motion } from "framer-motion";

/**
 * Primary control. Sized for gloved hands — the large variant clears 52px,
 * well past the 48px touch minimum, because this gets tapped outdoors with
 * dirty fingers.
 */
export const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  fullWidth = true,
  disabled = false,
  loading = false,
  icon: Icon = null,
  className = "",
  type = "button"
}) => {
  const base =
    "relative inline-flex items-center justify-center gap-2.5 font-semibold rounded-xl tap " +
    "transition-[background-color,border-color,color,opacity] duration-150 " +
    "disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700",
    secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-100",
    outline: "bg-surface text-ink border border-line hover:bg-sunken active:bg-sunken",
    ghost: "bg-transparent text-muted hover:bg-sunken active:bg-sunken",
    dark: "bg-ink text-white hover:opacity-90 active:opacity-90",
    gold: "bg-gold-500 text-ink hover:bg-gold-600 hover:text-white active:bg-gold-600",
    danger: "bg-alert-50 text-alert-600 border border-alert-100 hover:bg-alert-100"
  };

  const sizes = {
    sm: "h-9 px-3.5 text-[13px] rounded-lg",
    md: "h-11 px-4 text-[14px]",
    lg: "h-[52px] px-5 text-[16px]"
  };

  const iconSize = { sm: "text-sm", md: "text-base", lg: "text-lg" }[size];

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.975 } : {}}
      transition={{ duration: 0.12 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      {loading ? (
        <>
          <span
            className="w-[18px] h-[18px] rounded-full border-2 border-current border-r-transparent animate-spin"
            aria-hidden="true"
          />
          <span className="sr-only">Working</span>
        </>
      ) : (
        <>
          {Icon && <Icon className={`${iconSize} shrink-0`} />}
          <span className="truncate">{children}</span>
        </>
      )}
    </motion.button>
  );
};
