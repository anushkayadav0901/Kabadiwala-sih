import React from "react";

/**
 * Skeleton rows rather than a spinner — the shape of the answer appears
 * immediately, which reads as faster on the entry-level devices this has to
 * run on. `message` is kept for screen readers and for the full-page case.
 */
export const Loader = ({ fullPage = false, message = "Loading..." }) => {
  const rows = (
    <div className="space-y-2.5" role="status" aria-live="polite">
      <span className="sr-only">{message}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <div className="skel w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skel h-3.5 rounded" style={{ width: `${72 - i * 12}%` }} />
            <div className="skel h-2.5 w-1/3 rounded" />
          </div>
          <div className="skel h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 bg-surface/92 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
        <span
          className="w-8 h-8 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-muted">{message}</p>
      </div>
    );
  }

  return rows;
};
