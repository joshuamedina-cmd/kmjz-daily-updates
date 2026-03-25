import { useState, useEffect } from "react";

/* ──────────────────────────────────────────────
   PRODUCTION SPEEDOMETER
   Range: 1–30 kilos/day, needle-style gauge
   ────────────────────────────────────────────── */
export function ProductionGauge({ value = 7.2 }: { value?: number }) {
  const [animatedValue, setAnimatedValue] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const min = 1;
  const max = 30;
  const clamped = Math.max(min, Math.min(max, animatedValue));
  const pct = (clamped - min) / (max - min);
  // Arc from -135deg to +135deg (270deg sweep)
  const needleAngle = -135 + pct * 270;

  // Tick marks
  const ticks = [1, 5, 10, 15, 20, 25, 30];
  const tickAngles = ticks.map((t) => -135 + ((t - min) / (max - min)) * 270);

  return (
    <div className="gauge-card" data-testid="gauge-production">
      <div className="gauge-label">Daily Production</div>
      <div className="gauge-svg-wrap">
        <svg viewBox="0 0 200 130" className="w-full h-auto">
          <defs>
            <linearGradient id="prod-arc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
            </linearGradient>
            <filter id="prod-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={describeArc(100, 100, 70, -135, 135)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Colored arc */}
          <path
            d={describeArc(100, 100, 70, -135, 135)}
            fill="none"
            stroke="url(#prod-arc)"
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#prod-glow)"
          />

          {/* Tick marks + labels */}
          {ticks.map((t, i) => {
            const a = (tickAngles[i] * Math.PI) / 180;
            const inner = 56;
            const outer = 62;
            const labelR = 48;
            return (
              <g key={t}>
                <line
                  x1={100 + inner * Math.cos(a)}
                  y1={100 + inner * Math.sin(a)}
                  x2={100 + outer * Math.cos(a)}
                  y2={100 + outer * Math.sin(a)}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1.5"
                  opacity="0.5"
                />
                <text
                  x={100 + labelR * Math.cos(a)}
                  y={100 + labelR * Math.sin(a)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  fontSize="9"
                  fontWeight="600"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Needle */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: "100px 100px",
              transition: "transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="38"
              stroke="hsl(var(--foreground))"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Center dot */}
          <circle cx="100" cy="100" r="5" className="fill-foreground" />
          <circle cx="100" cy="100" r="2.5" className="fill-background" />

          {/* Value */}
          <text
            x="100"
            y="120"
            textAnchor="middle"
            className="fill-foreground"
            fontSize="16"
            fontWeight="700"
          >
            {animatedValue.toFixed(1)}
          </text>
        </svg>
      </div>
      <div className="gauge-unit">kilos / day</div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   FINANCIAL HEALTH — Temperature gauge
   Scale 1–100, needle between 5 and 11
   Red glow left, green glow right
   ────────────────────────────────────────────── */
export function FinancialHealthGauge({ value = 1 }: { value?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const totalLevels = 9;
  const activeLevel = Math.max(1, Math.min(totalLevels, Math.round(animatedValue)));

  // Level labels
  const labels = [
    "CRITICAL", "DISTRESS", "SEVERE", "POOR", "FAIR",
    "STABLE", "GOOD", "STRONG", "EXCELLENT",
  ];

  // Colors: 1=deep red → 9=deep green
  const colors = [
    "#dc2626", "#ef4444", "#f97316", "#f59e0b", "#eab308",
    "#84cc16", "#22c55e", "#16a34a", "#15803d",
  ];

  return (
    <div className="gauge-card" data-testid="gauge-financial">
      <div className="gauge-label">Financial Health</div>
      <div className="flex flex-col items-center gap-1 py-2 px-2">
        {/* 9-level bar stack — top is level 9, bottom is level 1 */}
        <div className="flex flex-col-reverse items-center gap-[3px] w-full">
          {Array.from({ length: totalLevels }, (_, i) => {
            const level = i + 1;
            const isActive = level <= activeLevel;
            const color = colors[i];
            return (
              <div
                key={level}
                className="flex items-center gap-2 w-full"
                style={{ transition: "opacity 0.4s ease" }}
              >
                {/* Level number */}
                <span
                  className="text-[9px] font-bold w-3 text-right shrink-0"
                  style={{ color: isActive ? color : "hsl(var(--muted-foreground) / 0.3)" }}
                >
                  {level}
                </span>
                {/* Bar segment */}
                <div
                  className="h-[10px] rounded-sm flex-1 relative overflow-hidden"
                  style={{
                    backgroundColor: isActive ? color : "hsl(var(--border) / 0.5)",
                    boxShadow: isActive ? `0 0 8px ${color}60, 0 0 2px ${color}40` : "none",
                    opacity: isActive ? 1 : 0.35,
                    transition: "all 0.6s ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Status label */}
        <div
          className="text-center mt-1 font-bold text-[13px] tracking-wide"
          style={{
            color: colors[activeLevel - 1],
            textShadow: `0 0 8px ${colors[activeLevel - 1]}50`,
          }}
        >
          {labels[activeLevel - 1]}
        </div>
        <div className="text-[10px] text-muted-foreground/60 text-center">
          Level {activeLevel} of {totalLevels}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   SALES — Vertical bar meter
   Percentage 0–100%, green glow top, red glow bottom
   ────────────────────────────────────────────── */
export function SalesGauge({ value = 100 }: { value?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const pct = Math.max(0, Math.min(100, animatedValue));
  const barHeight = 100;
  const fillHeight = (pct / 100) * barHeight;

  return (
    <div className="gauge-card" data-testid="gauge-sales">
      <div className="gauge-label">Sales</div>
      <div className="gauge-svg-wrap" style={{ maxWidth: 110, margin: "0 auto" }}>
        <svg viewBox="0 0 80 140" className="w-full h-auto">
          <defs>
            <linearGradient id="sales-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <filter id="sales-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background bar */}
          <rect
            x="18"
            y="10"
            width="30"
            height={barHeight}
            rx="6"
            fill="hsl(var(--border))"
            opacity="0.7"
          />

          {/* Filled bar */}
          <rect
            x="18"
            y={10 + (barHeight - fillHeight)}
            width="30"
            height={fillHeight}
            rx="6"
            fill="url(#sales-fill)"
            filter="url(#sales-glow)"
            style={{
              transition: "y 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), height 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />

          {/* Percentage labels on right */}
          {[0, 25, 50, 75, 100].map((p) => {
            const y = 10 + barHeight - (p / 100) * barHeight;
            return (
              <g key={p}>
                <line
                  x1="50"
                  y1={y}
                  x2="53"
                  y2={y}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                  opacity="0.4"
                />
                <text
                  x="57"
                  y={y}
                  dominantBaseline="middle"
                  textAnchor="start"
                  className="fill-muted-foreground"
                  fontSize="8"
                >
                  {p}%
                </text>
              </g>
            );
          })}

          {/* Value */}
          <text
            x="33"
            y="128"
            textAnchor="middle"
            className="fill-foreground"
            fontSize="16"
            fontWeight="700"
          >
            {Math.round(animatedValue)}%
          </text>
        </svg>
      </div>
      <div className="text-[10px] text-muted-foreground/70 text-center mt-1 leading-tight px-2">
        100% = everything we make is sold
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   AR — Accounts Receivable
   ────────────────────────────────────────────── */
const AR_ITEMS = [
  { source: "QuickBooks", amount: 208000 },
  { source: "Chase JJ Konsult", amount: 48000, note: "Account Closed" },
];

export function ARBox() {
  const [expanded, setExpanded] = useState(false);
  const total = AR_ITEMS.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div
      className="gauge-card cursor-pointer hover:border-foreground/20 transition-colors"
      data-testid="gauge-ar"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="gauge-label">AR (Receivables)</div>
      <div className="flex flex-col items-center gap-1 py-3">
        <div className="text-2xl font-bold text-emerald-600 tracking-tight">
          ${total.toLocaleString()}
        </div>
        <div className="text-[10px] text-muted-foreground/60">
          {expanded ? "tap to collapse" : "tap for details"}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1.5">
          {AR_ITEMS.map((item) => (
            <div key={item.source} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {item.source}
                {item.note && (
                  <span className="ml-1 text-red-500/70 text-[9px] font-medium uppercase">
                    ({item.note})
                  </span>
                )}
              </span>
              <span className="font-semibold text-foreground">
                ${item.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   AP — Accounts Payable
   ────────────────────────────────────────────── */
const AP_ITEMS = [
  { vendor: "Ripal Transactions", amount: 109200 },
  { vendor: "Vishaal Mali Transactions", amount: 120750 },
  { vendor: "Ashlynn Marketing Group", amount: 174750 },
  { vendor: "Palmdale Lease", amount: 111288 },
  { vendor: "Peanut Supply", amount: 246775 },
  { vendor: "Organic Kratom Siam Co.", amount: 46400 },
  { vendor: "Woody Active", amount: 38000 },
  { vendor: "RMS Direct", amount: 160000 },
  { vendor: "Cross Pac Ventures", amount: 149250 },
];

export function APBox() {
  const [expanded, setExpanded] = useState(false);
  const total = AP_ITEMS.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div
      className="gauge-card cursor-pointer hover:border-foreground/20 transition-colors"
      data-testid="gauge-ap"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="gauge-label">AP (Payables)</div>
      <div className="flex flex-col items-center gap-1 py-3">
        <div className="text-2xl font-bold text-red-500 tracking-tight">
          -${total.toLocaleString()}
        </div>
        <div className="text-[10px] text-muted-foreground/60">
          {expanded ? "tap to collapse" : `${AP_ITEMS.length} vendors · tap for details`}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1.5">
          {AP_ITEMS.map((item) => (
            <div key={item.vendor} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground truncate mr-2">
                {item.vendor}
              </span>
              <span className="font-semibold text-red-500/90 shrink-0">
                -${item.amount.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-[11px] pt-1.5 mt-1.5 border-t border-border/40">
            <span className="font-bold text-foreground">TOTAL</span>
            <span className="font-bold text-red-500">
              -${total.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   FULL DASHBOARD PANEL
   ────────────────────────────────────────────── */
export default function DashboardGauges() {
  return (
    <div className="dashboard-gauges">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        At a Glance
      </h2>
      <div className="gauges-grid">
        <ProductionGauge value={7.2} />
        <FinancialHealthGauge value={1} />
        <SalesGauge value={100} />
        <ARBox />
        <APBox />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   SVG ARC HELPER
   ────────────────────────────────────────────── */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
