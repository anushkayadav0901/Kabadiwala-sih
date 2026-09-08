// ---------------------------------------------------------------------------
// CHART PRIMITIVES — hand-rolled SVG, no charting library.
//
// The PS requires the app to stay small enough for entry-level Android devices,
// so a 200KB charting dependency is not affordable here. Every chart below is a
// few dozen lines of SVG and carries its own hover layer.
//
// Category colours come from a CVD-validated palette; every mark that uses them
// is also directly labelled, so colour never carries identity alone.
// ---------------------------------------------------------------------------
import React, { useState, useRef } from "react";

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const BRAND = "#3A34D4";
const GRID = "#EFF1F7";
const AXIS = "#E4E7F0";
const MUTED = "#7B85A0";

const niceMax = (value) => {
  if (value <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / pow) * pow;
};

const Tooltip = ({ x, y, width, children }) => {
  const flip = x > width * 0.6;
  return (
    <foreignObject x={flip ? x - 132 : x + 8} y={Math.max(y - 10, 0)} width="128" height="70" style={{ overflow: "visible", pointerEvents: "none" }}>
      <div style={{
        background: "#0F1424", color: "#fff", borderRadius: 8, padding: "6px 9px",
        fontSize: 11, lineHeight: 1.4, boxShadow: "0 4px 14px rgba(15,20,36,0.22)"
      }}>
        {children}
      </div>
    </foreignObject>
  );
};

// ---------------------------------------------------------------------------
// Area chart — one series over time, crosshair + tooltip on hover.
// ---------------------------------------------------------------------------
export const AreaChart = ({ data, valueKey = "earnings", height = 150, format = (v) => v, labelFor }) => {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const W = 320, H = height, PAD = { t: 10, r: 8, b: 20, l: 34 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  if (!data?.length) return <div className="text-[12px] text-faint py-8 text-center">No data for this period</div>;

  const max = niceMax(Math.max(...data.map((d) => Number(d[valueKey]) || 0)));
  const xAt = (i) => PAD.l + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yAt = (v) => PAD.t + plotH - ((Number(v) || 0) / max) * plotH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d[valueKey])}`).join(" ");
  const area = `${line} L${xAt(data.length - 1)},${PAD.t + plotH} L${xAt(0)},${PAD.t + plotH} Z`;

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.l) / plotW) * (data.length - 1));
    setHover(idx >= 0 && idx < data.length ? idx : null);
  };

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(null)}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} stopOpacity="0.22" />
          <stop offset="100%" stopColor={BRAND} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH * f} y2={PAD.t + plotH * f} stroke={GRID} strokeWidth="1" />
          <text x={PAD.l - 5} y={PAD.t + plotH * f + 3} textAnchor="end" fontSize="8.5" fill={MUTED}>
            {format(Math.round(max * (1 - f)))}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={BRAND} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {hover !== null && (
        <>
          <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.t} y2={PAD.t + plotH} stroke={BRAND} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <circle cx={xAt(hover)} cy={yAt(data[hover][valueKey])} r="4.5" fill={BRAND} stroke="#fff" strokeWidth="2" />
          <Tooltip x={xAt(hover)} y={yAt(data[hover][valueKey])} width={W}>
            <div style={{ opacity: 0.65, fontSize: 10 }}>{labelFor ? labelFor(data[hover]) : data[hover].date}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{format(data[hover][valueKey])}</div>
          </Tooltip>
        </>
      )}

      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke={AXIS} strokeWidth="1" />
      {data.length > 1 && [0, data.length - 1].map((i) => (
        <text key={i} x={xAt(i)} y={H - 6} textAnchor={i === 0 ? "start" : "end"} fontSize="8.5" fill={MUTED}>
          {labelFor ? labelFor(data[i]) : data[i].date?.slice(5)}
        </text>
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Vertical bars — small series (weeks, days), hover tooltip per bar.
// ---------------------------------------------------------------------------
export const BarChart = ({ data, valueKey = "earnings", labelKey = "label", height = 130, format = (v) => v }) => {
  const [hover, setHover] = useState(null);
  const W = 320, H = height, PAD = { t: 10, r: 6, b: 20, l: 34 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  if (!data?.length) return <div className="text-[12px] text-faint py-8 text-center">No data for this period</div>;

  const max = niceMax(Math.max(...data.map((d) => Number(d[valueKey]) || 0)));
  const slot = plotW / data.length;
  const barW = Math.min(slot - 6, 34);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH * f} y2={PAD.t + plotH * f} stroke={GRID} strokeWidth="1" />
          <text x={PAD.l - 5} y={PAD.t + plotH * f + 3} textAnchor="end" fontSize="8.5" fill={MUTED}>
            {format(Math.round(max * (1 - f)))}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const h = Math.max((v / max) * plotH, v > 0 ? 3 : 0);
        const x = PAD.l + slot * i + (slot - barW) / 2;
        const y = PAD.t + plotH - h;
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={PAD.l + slot * i} y={PAD.t} width={slot} height={plotH} fill="transparent" />
            <rect x={x} y={y} width={barW} height={h} rx="4"
              fill={hover === i ? BRAND : "#6C66E8"} style={{ transition: "fill .15s" }} />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="8.5" fill={MUTED}>{d[labelKey]}</text>
            {hover === i && (
              <Tooltip x={x + barW} y={y} width={W}>
                <div style={{ opacity: 0.65, fontSize: 10 }}>{d[labelKey]}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{format(v)}</div>
              </Tooltip>
            )}
          </g>
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke={AXIS} strokeWidth="1" />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Horizontal bars — the material mix. Every row is directly labelled with its
// name and value, so the category colours are reinforcement, never the only cue.
// ---------------------------------------------------------------------------
export const MixBars = ({ data, valueKey = "weightShare", labelKey = "label", format = (v) => `${v}%`, subFormat }) => {
  if (!data?.length) return <div className="text-[12px] text-faint py-6 text-center">No materials recorded yet</div>;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={d.category || i}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[12.5px] font-semibold text-ink truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: SERIES[i % SERIES.length] }} />
              {d[labelKey]}
            </span>
            <span className="text-[12.5px] font-bold tnum text-ink shrink-0">{format(d[valueKey])}</span>
          </div>
          <div className="h-2 rounded-full bg-sunken overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${((Number(d[valueKey]) || 0) / max) * 100}%`,
              background: SERIES[i % SERIES.length],
              transition: "width .4s ease"
            }} />
          </div>
          {subFormat && <p className="text-[11px] text-faint mt-0.5">{subFormat(d)}</p>}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Day-of-week intensity — sequential single hue, magnitude by opacity.
// ---------------------------------------------------------------------------
export const DayPattern = ({ data, valueKey = "earnings", format = (v) => v }) => {
  const [hover, setHover] = useState(null);
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1.5">
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const intensity = v / max;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 relative"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && (
              <div className="absolute -top-11 z-10 px-2 py-1 rounded-lg bg-ink text-white text-[10.5px] whitespace-nowrap shadow-lg">
                <div className="opacity-65">{d.trips} trip{d.trips === 1 ? "" : "s"}</div>
                <div className="font-bold text-[12px]">{format(v)}</div>
              </div>
            )}
            <div className="w-full rounded-md" style={{
              height: 34,
              background: v > 0 ? BRAND : "#F1F3F9",
              opacity: v > 0 ? 0.22 + intensity * 0.78 : 1,
              transition: "opacity .2s"
            }} />
            <span className="text-[10px] text-faint font-medium">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stat tile with optional period-over-period delta.
// ---------------------------------------------------------------------------
export const StatTile = ({ label, value, delta, sub, accent }) => {
  const up = Number(delta) > 0;
  const flat = delta === undefined || delta === null || Number(delta) === 0;
  return (
    <div className="card p-3.5">
      <p className="text-[11px] text-faint font-medium leading-tight">{label}</p>
      <p className="text-[20px] font-bold tnum leading-tight mt-1" style={accent ? { color: accent } : undefined}>{value}</p>
      {!flat && (
        <p className={`text-[11px] font-semibold mt-0.5 tnum ${up ? "text-green-600" : "text-alert-600"}`}>
          {up ? "▲" : "▼"} {Math.abs(Number(delta))}% <span className="text-faint font-normal">vs prev</span>
        </p>
      )}
      {flat && sub && <p className="text-[11px] text-faint mt-0.5">{sub}</p>}
    </div>
  );
};
