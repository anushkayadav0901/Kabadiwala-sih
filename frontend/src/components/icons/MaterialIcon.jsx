import React from "react";

/* ==========================================================================
   MATERIAL ICON SET
   --------------------------------------------------------------------------
   A flat, geometric set drawn on a 24x24 grid, replacing the emoji the app
   used to render. Every glyph is built from currentColor at two opacities, so
   an icon takes the colour of whatever tile it sits in and never clashes.

   Ships inside the bundle — no network, so it survives airplane mode along
   with the on-device classifier.
   ========================================================================== */

const S = ({ children, ...rest }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

/* Back layer: the same hue, dialled down, so forms read at 20px. */
const Sub = (props) => <g fill="currentColor" opacity=".32" {...props} />;
const Main = (props) => <g fill="currentColor" {...props} />;

const glyphs = {
  /* Printed circuit board — traces running to edge pads, one seated chip. */
  pcb: (
    <>
      <Sub><rect x="2.5" y="4.5" width="19" height="15" rx="2.2" /></Sub>
      <Main>
        <rect x="8" y="9" width="8" height="6" rx="1.2" />
        <rect x="4.6" y="6.6" width="2.2" height="1.5" rx=".6" />
        <rect x="4.6" y="15.9" width="2.2" height="1.5" rx=".6" />
        <rect x="17.2" y="6.6" width="2.2" height="1.5" rx=".6" />
        <rect x="17.2" y="15.9" width="2.2" height="1.5" rx=".6" />
        <path d="M5.7 8.6v2.2a1 1 0 0 0 1 1H8v1.3H6.7a2.3 2.3 0 0 1-2.3-2.3V8.6zM18.3 8.6v2.2a1 1 0 0 1-1 1H16v1.3h1.3a2.3 2.3 0 0 0 2.3-2.3V8.6z" />
      </Main>
    </>
  ),

  /* Mobile handset. */
  mobile: (
    <>
      <Sub><rect x="6" y="2" width="12" height="20" rx="2.8" /></Sub>
      <Main>
        <rect x="7.6" y="5.4" width="8.8" height="12" rx="1.1" />
        <rect x="10.2" y="3.3" width="3.6" height="1" rx=".5" />
        <circle cx="12" cy="19.6" r=".95" />
      </Main>
    </>
  ),

  /* Flat panel on a pedestal stand. */
  television: (
    <>
      <Sub><rect x="2" y="4" width="20" height="13" rx="2" /></Sub>
      <Main>
        <rect x="4" y="6" width="16" height="9" rx="1" />
        <rect x="10.8" y="17" width="2.4" height="3" />
        <rect x="7.5" y="19.6" width="9" height="1.8" rx=".9" />
      </Main>
    </>
  ),

  /* Keyboard — key field plus space bar. */
  keyboard: (
    <>
      <Sub><rect x="1.5" y="6" width="21" height="12" rx="2.2" /></Sub>
      <Main>
        <rect x="4" y="8.4" width="2" height="2" rx=".5" />
        <rect x="7.2" y="8.4" width="2" height="2" rx=".5" />
        <rect x="10.4" y="8.4" width="2" height="2" rx=".5" />
        <rect x="13.6" y="8.4" width="2" height="2" rx=".5" />
        <rect x="16.8" y="8.4" width="3.2" height="2" rx=".5" />
        <rect x="4" y="11.6" width="3.2" height="2" rx=".5" />
        <rect x="8.4" y="11.6" width="2" height="2" rx=".5" />
        <rect x="11.6" y="11.6" width="2" height="2" rx=".5" />
        <rect x="14.8" y="11.6" width="5.2" height="2" rx=".5" />
        <rect x="6.6" y="14.8" width="10.8" height="1.8" rx=".7" />
      </Main>
    </>
  ),

  /* Mouse with a scroll wheel. */
  mouse: (
    <>
      <Sub><path d="M12 2.4a6.6 6.6 0 0 1 6.6 6.6v6a6.6 6.6 0 0 1-13.2 0V9A6.6 6.6 0 0 1 12 2.4Z" /></Sub>
      <Main>
        <rect x="11.1" y="6" width="1.8" height="4.4" rx=".9" />
        <path d="M5.6 11.4h12.8v1.3H5.6z" opacity=".9" />
      </Main>
    </>
  ),

  /* Printer — sheet feeding out of the top. */
  printer: (
    <>
      <Sub><rect x="2.5" y="8.5" width="19" height="9" rx="2" /></Sub>
      <Main>
        <path d="M6.5 2.6h11v5.9h-11z" opacity=".55" />
        <rect x="6.5" y="15" width="11" height="6.4" rx="1" />
        <rect x="8.4" y="17.1" width="7.2" height="1.2" rx=".6" />
        <rect x="8.4" y="19.1" width="4.8" height="1.2" rx=".6" />
        <circle cx="18.4" cy="11.4" r="1.1" />
      </Main>
    </>
  ),

  /* Microwave — door window and control column. */
  microwave: (
    <>
      <Sub><rect x="1.5" y="5" width="21" height="14" rx="2.2" /></Sub>
      <Main>
        <rect x="3.8" y="7.4" width="11.4" height="9.2" rx="1.1" />
        <rect x="17.2" y="7.4" width="3" height="4.6" rx=".8" />
        <rect x="17.2" y="13.6" width="3" height="1.3" rx=".65" />
        <rect x="17.2" y="15.6" width="3" height="1" rx=".5" />
      </Main>
    </>
  ),

  /* Disc player — slot-loading deck. */
  player: (
    <>
      <Sub><rect x="1.5" y="7" width="21" height="10" rx="2.2" /></Sub>
      <Main>
        <circle cx="8" cy="12" r="3.1" />
        <circle cx="8" cy="12" r="1" fill="var(--color-surface, #fff)" />
        <rect x="13" y="10.3" width="7" height="1.4" rx=".7" />
        <rect x="13" y="13" width="4.4" height="1.4" rx=".7" />
      </Main>
    </>
  ),

  /* Front-loading washing machine. */
  washing_machine: (
    <>
      <Sub><rect x="3.5" y="2" width="17" height="20" rx="2.4" /></Sub>
      <Main>
        <circle cx="12" cy="14.2" r="4.4" />
        <circle cx="12" cy="14.2" r="2.1" fill="var(--color-surface, #fff)" />
        <circle cx="7" cy="5.6" r="1.1" />
        <rect x="14" y="4.7" width="4.5" height="1.8" rx=".9" />
      </Main>
    </>
  ),

  /* Cell with terminal cap and charge bolt. */
  battery: (
    <>
      <Sub><rect x="4.5" y="5" width="15" height="16" rx="2.2" /></Sub>
      <Main>
        <rect x="8" y="2.6" width="3" height="2.6" rx=".8" />
        <rect x="13" y="2.6" width="3" height="2.6" rx=".8" />
        <path d="M12.9 8.2 9 14.1h2.5l-.9 3.9 4.2-6.2h-2.6z" />
      </Main>
    </>
  ),

  /* Coiled copper — a spiral with two cut ends. */
  copper: (
    <>
      <Sub><circle cx="12" cy="12" r="9.2" /></Sub>
      <Main>
        <path
          d="M12 5.2a6.8 6.8 0 1 1-6.8 6.8h2.1A4.7 4.7 0 1 0 12 7.3z"
        />
        <path d="M12 9.1a2.9 2.9 0 1 1-2.9 2.9h1.7a1.2 1.2 0 1 0 1.2-1.2z" />
      </Main>
    </>
  ),

  /* Stacked ingots. */
  brass: (
    <>
      <Sub><path d="M4.2 13.4h15.6l1.6 4.4H2.6z" /></Sub>
      <Main>
        <path d="M7.3 6.2h9.4l1.4 4.1H5.9z" />
        <rect x="2.6" y="18.4" width="18.8" height="2.2" rx=".9" opacity=".55" />
      </Main>
    </>
  ),

  /* HDPE drum with a moulded handle. */
  plastic: (
    <>
      <Sub><path d="M6 8.2h12v11.4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" /></Sub>
      <Main>
        <rect x="9.6" y="2.4" width="4.8" height="3.2" rx="1" />
        <path d="M8.3 5.6h7.4L18 8.2H6z" />
        <rect x="8.6" y="11.4" width="6.8" height="1.5" rx=".75" />
        <path d="M16.8 9.6h1.4a1.6 1.6 0 0 1 1.6 1.6v1.6a1.6 1.6 0 0 1-1.6 1.6h-1.4v-1.6h1.2v-1.6h-1.2z" />
      </Main>
    </>
  ),

  /* Electric motor — finned body with a drive shaft. */
  motor: (
    <>
      <Sub><rect x="4.5" y="6.6" width="12.4" height="10.8" rx="2" /></Sub>
      <Main>
        <rect x="16.9" y="10.6" width="4.6" height="2.8" rx="1" />
        <rect x="2.2" y="9.4" width="2.6" height="5.2" rx=".9" />
        <rect x="7.2" y="4.2" width="1.6" height="2.6" rx=".7" />
        <rect x="12.6" y="4.2" width="1.6" height="2.6" rx=".7" />
        <circle cx="10.7" cy="12" r="2.7" />
        <circle cx="10.7" cy="12" r=".95" fill="var(--color-surface, #fff)" />
      </Main>
    </>
  ),

  /* Flattened corrugated carton. */
  paper: (
    <>
      <Sub><path d="M2.4 7.6 12 4.2l9.6 3.4v9.6L12 20.6l-9.6-3.4z" /></Sub>
      <Main>
        <path d="M2.4 7.6 12 11v9.6l-9.6-3.4z" opacity=".55" />
        <rect x="9.4" y="6.1" width="5.2" height="1.6" rx=".8" />
      </Main>
    </>
  ),

  /* Bent steel angle. */
  metal: (
    <>
      <Sub><path d="M3 4h4.6v12.4H21V21H3z" /></Sub>
      <Main><path d="M9.6 4H21v4.6h-6.8v6.2H9.6z" /></Main>
    </>
  ),

  /* CRT tube — deep body, curved face. */
  crt: (
    <>
      <Sub><path d="M3 5.2h18v10.4a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 15.6z" /></Sub>
      <Main>
        <rect x="5" y="7" width="11" height="8" rx="1.4" />
        <rect x="17.4" y="7.6" width="2" height="1.4" rx=".7" />
        <rect x="17.4" y="10.2" width="2" height="1.4" rx=".7" />
        <rect x="7" y="19" width="10" height="1.9" rx=".95" />
        <rect x="10.9" y="17.2" width="2.2" height="2.2" />
      </Main>
    </>
  ),

  /* Generic hazardous item. */
  hazard: (
    <>
      <Sub><path d="M12 2.8 22.2 20.6H1.8z" /></Sub>
      <Main>
        <path d="M12.6 8.4 8.9 14.9h2.6l-.8 3.6 3.9-5.9h-2.5z" />
      </Main>
    </>
  ),

  /* Fallback: a tied scrap bundle. */
  scrap: (
    <>
      <Sub><path d="M4.4 8.6h15.2l1.3 10.2a2 2 0 0 1-2 2.2H5.1a2 2 0 0 1-2-2.2z" /></Sub>
      <Main>
        <path d="M8.4 8.6V6.4a3.6 3.6 0 1 1 7.2 0v2.2h-2.1V6.4a1.5 1.5 0 1 0-3 0v2.2z" />
        <rect x="7.2" y="12.6" width="9.6" height="1.6" rx=".8" />
      </Main>
    </>
  )
};

/* ---- resolution ---------------------------------------------------------
   Materials are matched by id, then by their AI class label, then by name
   keyword, then by category — so it works for catalogue rows, model output
   and free-text transaction records alike, without touching the data files.
   ------------------------------------------------------------------------ */

const BY_ID = {
  mat_pcb: "pcb", ai_pcb: "pcb", PCB: "pcb",
  mat_mobile: "mobile", ai_mobile: "mobile", Mobile: "mobile",
  mat_television: "television", ai_television: "television", Television: "television", LCD: "television",
  mat_keyboard: "keyboard", ai_keyboard: "keyboard", Keyboard: "keyboard",
  mat_mouse: "mouse", ai_mouse: "mouse", Mouse: "mouse",
  mat_printer: "printer", ai_printer: "printer", Printer: "printer",
  mat_microwave: "microwave", ai_microwave: "microwave", Microwave: "microwave",
  mat_player: "player", ai_player: "player", Player: "player",
  mat_washing_machine: "washing_machine", ai_washing_machine: "washing_machine",
  "Washing Machine": "washing_machine",
  mat_battery: "battery", ai_battery: "battery", Battery: "battery", batteries: "battery",
  mat_copper: "copper", cables: "copper",
  mat_brass: "brass",
  mat_plastic: "plastic", mixed_plastic: "plastic",
  mat_motor: "motor", motors: "motor",
  mat_paper: "paper", paper: "paper",
  metal: "metal",
  CRT: "crt"
};

const BY_KEYWORD = [
  ["circuit", "pcb"], ["pcb", "pcb"],
  ["mobile", "mobile"], ["phone", "mobile"],
  ["television", "television"], ["monitor", "television"], ["lcd", "television"], ["led", "television"],
  ["keyboard", "keyboard"],
  ["mouse", "mouse"],
  ["printer", "printer"], ["scanner", "printer"],
  ["microwave", "microwave"],
  ["player", "player"], ["dvd", "player"],
  ["washing", "washing_machine"],
  ["battery", "battery"],
  ["copper", "copper"], ["wire", "copper"], ["cable", "copper"],
  ["brass", "brass"], ["pitul", "brass"],
  ["plastic", "plastic"], ["hdpe", "plastic"],
  ["motor", "motor"], ["transformer", "motor"],
  ["cardboard", "paper"], ["paper", "paper"],
  ["crt", "crt"]
];

const BY_CATEGORY = {
  e_waste: "pcb",
  metal: "metal",
  plastic: "plastic",
  paper: "paper",
  hazardous: "battery",
  all: "scrap"
};

export const resolveGlyph = (material) => {
  if (!material) return "scrap";
  if (typeof material === "string") {
    return BY_ID[material] || glyphKeyword(material) || BY_CATEGORY[material] || "scrap";
  }
  const direct =
    BY_ID[material.id] || BY_ID[material.dbCategory] || BY_ID[material.category];
  if (direct) return direct;

  const keyword = glyphKeyword(
    `${material.name || ""} ${material.materialName || ""} ${material.dbCategory || ""}`
  );
  if (keyword) return keyword;

  return BY_CATEGORY[material.category] || "scrap";
};

const glyphKeyword = (text) => {
  const t = String(text).toLowerCase();
  for (const [needle, glyph] of BY_KEYWORD) if (t.includes(needle)) return glyph;
  return null;
};

/** Raw glyph, inheriting colour and size from its parent. */
export const MaterialGlyph = ({ material, name, className = "w-6 h-6" }) => (
  <S className={className}>{glyphs[name || resolveGlyph(material)] || glyphs.scrap}</S>
);

/**
 * Glyph seated in a tinted tile — the standard presentation everywhere a
 * material appears in a row or a card.
 */
export const MaterialIcon = ({
  material,
  name,
  size = "md",
  tone = "brand",
  className = ""
}) => {
  const box = {
    sm: "w-9 h-9 rounded-[10px]",
    md: "w-12 h-12 rounded-xl",
    lg: "w-16 h-16 rounded-2xl",
    xl: "w-20 h-20 rounded-[20px]"
  }[size];

  const glyph = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
    xl: "w-11 h-11"
  }[size];

  const tones = {
    brand: "bg-brand-50 text-brand-600",
    gold: "bg-gold-50 text-gold-600",
    ink: "bg-sunken text-ink",
    alert: "bg-alert-50 text-alert-600",
    onDark: "bg-white/10 text-white"
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${box} ${tones[tone]} ${className}`}
    >
      <MaterialGlyph material={material} name={name} className={glyph} />
    </span>
  );
};

export default MaterialIcon;
