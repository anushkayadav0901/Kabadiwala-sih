import React from "react";
import { FaCheck, FaTruck, FaArrowUp, FaArrowDown } from "react-icons/fa";

/**
 * Status pills. Note there is no green in this system: "verified" reads as an
 * official indigo tick — the way an authorised-account badge does — which is
 * what MPCB authorisation actually means here, rather than a generic success
 * colour. Gold carries value and upward rate movement.
 */
export const StatusBadge = ({ type, text, className = "" }) => {
  if (type === "verified") {
    return (
      <span className={`badge bg-brand-50 text-brand-700 ${className}`}>
        <span className="w-3.5 h-3.5 rounded-full bg-brand-600 text-white grid place-items-center">
          <FaCheck className="text-[7px]" />
        </span>
        <span>{text || "Authorized"}</span>
      </span>
    );
  }

  if (type === "epr") {
    return (
      <span className={`badge bg-green-50 text-green-700 ${className}`}>
        <span className="w-3.5 h-3.5 rounded-full bg-green-600 text-white grid place-items-center">
          <FaCheck className="text-[7px]" />
        </span>
        <span>{text || "EPR Partner"}</span>
      </span>
    );
  }

  if (type === "pickup") {
    return (
      <span className={`badge bg-gold-50 text-gold-700 ${className}`}>
        <FaTruck className="text-[9px]" />
        <span>{text || "Pickup"}</span>
      </span>
    );
  }

  if (type === "up") {
    return (
      <span className={`badge bg-gold-50 text-gold-700 tnum ${className}`}>
        <FaArrowUp className="text-[8px]" />
        <span>{text}</span>
      </span>
    );
  }

  if (type === "down") {
    return (
      <span className={`badge bg-alert-50 text-alert-600 tnum ${className}`}>
        <FaArrowDown className="text-[8px]" />
        <span>{text}</span>
      </span>
    );
  }

  const label = !text || text.toLowerCase() === "stable" ? "No change today" : text;
  return (
    <span className={`badge normal-case tracking-normal font-medium bg-sunken text-muted text-[11px] tnum ${className}`}>
      <span>{label}</span>
    </span>
  );
};
