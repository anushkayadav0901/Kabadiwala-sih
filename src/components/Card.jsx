import React from "react";
import { motion } from "framer-motion";

/**
 * Base surface. Deliberately restrained — a hairline border and a one-pixel
 * shadow, not the heavy rounded slabs the app used to stack. Depth is spent
 * on the few things that need to lift off the page, not on every block.
 */
export const Card = ({
  children,
  className = "",
  onClick,
  hoverable = false,
  padding = "p-4"
}) => {
  const Component = onClick ? motion.div : "div";
  const motionProps = onClick
    ? { whileTap: { scale: 0.985 }, transition: { duration: 0.12 } }
    : {};

  return (
    <Component
      {...motionProps}
      onClick={onClick}
      className={`card ${padding} ${
        onClick ? "cursor-pointer select-none tap active:bg-sunken/40" : ""
      } ${hoverable ? "transition-shadow hover:shadow-[var(--shadow-lift)]" : ""} ${className}`}
    >
      {children}
    </Component>
  );
};
