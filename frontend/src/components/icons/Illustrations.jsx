import React from "react";

/* ==========================================================================
   ILLUSTRATIONS
   --------------------------------------------------------------------------
   Flat pictograms drawn from the trade itself — a collector under a loaded
   sack, a hanging kanta, a depot shutter. Deliberately pictographic rather
   than realistic: the app's users may not read the label beside them, so the
   silhouette has to carry the meaning on its own.

   Colours come from the design tokens, so an illustration always agrees with
   the surface it sits on. Everything is inline — nothing to fetch offline.
   ========================================================================== */

const ink = "var(--color-ink, #0F1424)";
const brand = "var(--color-brand-600, #3A34D4)";
const brandSoft = "var(--color-brand-100, #DEDCF9)";
const gold = "var(--color-gold-500, #F0A020)";
const goldSoft = "var(--color-gold-100, #FCE9C4)";
const line = "var(--color-line, #E4E7F0)";
const sunken = "var(--color-sunken, #F1F3F9)";

/** A collector carrying a loaded sack — used wherever a screen is empty. */
export const CollectorIllustration = ({ className = "w-44 h-36" }) => (
  <svg viewBox="0 0 220 176" fill="none" className={className} aria-hidden="true">
    <ellipse cx="110" cy="160" rx="74" ry="9" fill={sunken} />

    {/* the sack, riding high on the shoulder */}
    <path
      d="M116 40c22-6 46 8 52 32 6 25-6 48-28 54-23 6-44-6-50-30-6-25 4-50 26-56Z"
      fill={brandSoft}
    />
    <path
      d="M124 36c4-6 13-8 19-4s7 13 2 18l-9 9-16-14z"
      fill={brand}
    />
    <path d="M141 74c9 3 15 12 14 22" stroke={brand} strokeWidth="3.5" strokeLinecap="round" opacity=".45" />

    {/* body */}
    <path
      d="M74 78c0-11 9-20 20-20h14c11 0 20 9 20 20v34H74z"
      fill={brand}
    />
    {/* carrying arm reaching back over the shoulder */}
    <path
      d="M112 74c8-4 19-3 24 4"
      stroke={brand}
      strokeWidth="11"
      strokeLinecap="round"
    />
    {/* free arm */}
    <path d="M78 84v26" stroke={brand} strokeWidth="11" strokeLinecap="round" />

    {/* head + cap */}
    <circle cx="94" cy="42" r="16" fill={ink} />
    <path d="M76 40c0-11 8-19 18-19s18 8 18 19z" fill={gold} />
    <rect x="70" y="38" width="30" height="5" rx="2.5" fill={gold} />

    {/* legs */}
    <rect x="80" y="110" width="14" height="44" rx="6" fill={ink} />
    <rect x="102" y="110" width="14" height="44" rx="6" fill={ink} />
    <rect x="72" y="148" width="26" height="9" rx="4.5" fill={ink} opacity=".55" />
    <rect x="98" y="148" width="26" height="9" rx="4.5" fill={ink} opacity=".55" />
  </svg>
);

/** A hanging balance — the moment a lot gets weighed. */
export const ScaleIllustration = ({ className = "w-40 h-32" }) => (
  <svg viewBox="0 0 200 160" fill="none" className={className} aria-hidden="true">
    <ellipse cx="100" cy="148" rx="62" ry="8" fill={sunken} />

    {/* hook and column */}
    <path d="M100 12c8 0 12 6 12 12" stroke={ink} strokeWidth="5" strokeLinecap="round" />
    <rect x="96" y="24" width="8" height="22" rx="4" fill={ink} />

    {/* beam */}
    <rect x="34" y="44" width="132" height="7" rx="3.5" fill={ink} />
    <circle cx="100" cy="47" r="9" fill={gold} />
    <circle cx="100" cy="47" r="3.4" fill={ink} />

    {/* chains */}
    <path d="M46 51v20M154 51v20" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity=".5" />

    {/* pans */}
    <path d="M20 71h52l-10 22a6 6 0 0 1-5.4 3.4H35.4A6 6 0 0 1 30 93z" fill={brandSoft} />
    <path d="M20 71h52" stroke={brand} strokeWidth="4" strokeLinecap="round" />
    <path d="M128 71h52l-10 22a6 6 0 0 1-5.4 3.4h-21.2A6 6 0 0 1 138 93z" fill={goldSoft} />
    <path d="M128 71h52" stroke={gold} strokeWidth="4" strokeLinecap="round" />

    {/* the load: a coil and a board */}
    <circle cx="46" cy="64" r="7.5" fill={brand} />
    <circle cx="46" cy="64" r="2.6" fill={brandSoft} />
    <rect x="142" y="57" width="24" height="12" rx="2.5" fill={gold} />
    <rect x="147" y="60.5" width="14" height="5" rx="1.5" fill={goldSoft} />
  </svg>
);

/** A shuttered depot front — the recycler side of the app. */
export const DepotIllustration = ({ className = "w-44 h-32" }) => (
  <svg viewBox="0 0 220 160" fill="none" className={className} aria-hidden="true">
    <ellipse cx="110" cy="150" rx="80" ry="8" fill={sunken} />

    {/* awning */}
    <path d="M26 40h168l10 20H16z" fill={brand} />
    <path d="M16 60h188v6H16z" fill={ink} opacity=".18" />

    {/* wall */}
    <rect x="30" y="66" width="160" height="80" rx="4" fill={sunken} />

    {/* rolled shutter, half open */}
    <rect x="44" y="66" width="132" height="10" rx="3" fill={ink} opacity=".22" />
    <g fill={ink} opacity=".14">
      <rect x="44" y="80" width="132" height="6" rx="3" />
      <rect x="44" y="90" width="132" height="6" rx="3" />
    </g>

    {/* counter and scale */}
    <rect x="60" y="112" width="100" height="10" rx="3" fill={ink} />
    <rect x="70" y="122" width="8" height="24" rx="3" fill={ink} opacity=".5" />
    <rect x="142" y="122" width="8" height="24" rx="3" fill={ink} opacity=".5" />

    {/* stacked material on the counter */}
    <rect x="76" y="96" width="26" height="16" rx="2.5" fill={gold} />
    <rect x="82" y="100" width="14" height="8" rx="1.5" fill={goldSoft} />
    <circle cx="128" cy="104" r="8.5" fill={brand} />
    <circle cx="128" cy="104" r="3" fill={brandSoft} />

    {/* authorisation plate */}
    <rect x="86" y="18" width="48" height="16" rx="4" fill={ink} />
    <rect x="93" y="24" width="34" height="4" rx="2" fill={gold} />
  </svg>
);

/** An open, empty sack — the bag screen with nothing in it. */
export const EmptySackIllustration = ({ className = "w-36 h-32" }) => (
  <svg viewBox="0 0 180 160" fill="none" className={className} aria-hidden="true">
    <ellipse cx="90" cy="146" rx="54" ry="8" fill={sunken} />
    <path
      d="M52 56h76l10 68a14 14 0 0 1-13.9 15.9H55.9A14 14 0 0 1 42 124z"
      fill={sunken}
      stroke={line}
      strokeWidth="3"
    />
    <path
      d="M52 56c6-8 18-12 38-12s32 4 38 12"
      stroke={brand}
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M70 92h40" stroke={line} strokeWidth="5" strokeLinecap="round" />
    <path d="M78 108h24" stroke={line} strokeWidth="5" strokeLinecap="round" />
  </svg>
);

/** A signed, sealed handover slip. */
export const CertificateIllustration = ({ className = "w-36 h-32" }) => (
  <svg viewBox="0 0 180 160" fill="none" className={className} aria-hidden="true">
    <rect x="34" y="18" width="112" height="124" rx="8" fill="#fff" stroke={line} strokeWidth="3" />
    <rect x="52" y="38" width="60" height="7" rx="3.5" fill={ink} />
    <rect x="52" y="54" width="76" height="5" rx="2.5" fill={line} />
    <rect x="52" y="66" width="52" height="5" rx="2.5" fill={line} />
    <rect x="52" y="86" width="44" height="9" rx="4.5" fill={gold} />
    <rect x="52" y="102" width="66" height="5" rx="2.5" fill={line} />
    <circle cx="116" cy="116" r="18" fill={brandSoft} />
    <circle cx="116" cy="116" r="12.5" fill="none" stroke={brand} strokeWidth="2.5" strokeDasharray="3 3" />
    <path d="m110 116 4.4 4.6 8-8.8" stroke={brand} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/* ---- safety pictograms --------------------------------------------------
   The safety guide has to work for someone who cannot read the caption, so
   each rule gets a picture that states the rule by itself.
   ------------------------------------------------------------------------ */

const Prohibit = ({ children }) => (
  <>
    {children}
    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-alert-500, #E0384A)" strokeWidth="4" />
    <path d="M10 38 38 10" stroke="var(--color-alert-500, #E0384A)" strokeWidth="4" strokeLinecap="round" />
  </>
);

export const SafetyIcon = ({ name, className = "w-12 h-12" }) => {
  const art = {
    /* Never burn wire insulation. */
    no_fire: (
      <Prohibit>
        <path
          d="M24 12c5 5 8 9 8 14a8 8 0 0 1-16 0c0-3 2-5 4-8 1 2 2 3 3 3 1-3 1-6 1-9Z"
          fill="var(--color-gold-500, #F0A020)"
        />
      </Prohibit>
    ),
    /* Wear heavy gloves. */
    gloves: (
      <>
        <path
          d="M14 22V14a3 3 0 0 1 6 0v6h1.5v-8a3 3 0 0 1 6 0v8H29v-5a3 3 0 0 1 6 0v14a12 12 0 0 1-12 12h-1a10 10 0 0 1-10-10v-6a3 3 0 0 1 6 0z"
          fill="var(--color-brand-600, #3A34D4)"
        />
        <path d="M15 30h18" stroke="var(--color-brand-100, #DEDCF9)" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
    /* Keep batteries upright, never drain acid. */
    acid: (
      <>
        <rect x="12" y="14" width="24" height="26" rx="3" fill="var(--color-brand-600, #3A34D4)" />
        <rect x="16" y="9" width="6" height="5" rx="1.6" fill="var(--color-ink, #0F1424)" />
        <rect x="26" y="9" width="6" height="5" rx="1.6" fill="var(--color-ink, #0F1424)" />
        <path d="M25 19l-7 11h5l-2 7 8-11h-5z" fill="var(--color-gold-500, #F0A020)" />
      </>
    ),
    /* Separate hazardous material from ordinary scrap. */
    separate: (
      <>
        <path d="M24 6 43 39H5z" fill="var(--color-gold-500, #F0A020)" />
        <rect x="21.6" y="16" width="4.8" height="12" rx="2.4" fill="var(--color-ink, #0F1424)" />
        <circle cx="24" cy="33" r="2.8" fill="var(--color-ink, #0F1424)" />
      </>
    )
  }[name] || null;

  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {art}
    </svg>
  );
};

/** Maps a safety tip id from the data file to its pictogram. */
export const safetyGlyphFor = (id) =>
  ({ safe_1: "no_fire", safe_2: "gloves", safe_3: "acid", safe_4: "separate" }[id] || "separate");

/**
 * The brand lockup, served from /public/brand.
 *
 *   variant="full"  the complete logo with wordmark and tagline — splash and
 *                   the auth screens, where there is room to read it.
 *   variant="mark"  the collector on their own, cropped square — the app bar
 *                   and anywhere the logo has to work at 40px or less.
 *
 * The source art is dark indigo on transparent, so on a dark surface put it in
 * a light tile rather than dropping it straight onto the ink.
 */
export const BrandMark = ({
  className = "w-14 h-14",
  variant = "mark",
  alt = "Kabadiwala Connect"
}) => (
  <img
    src={variant === "full" ? "/brand/logo-full.png" : "/brand/logo-mark.png"}
    alt={alt}
    draggable="false"
    className={`${className} object-contain select-none`}
  />
);
