/**
 * Product illustrations. The API has no images, so each seed SKU gets a hand-drawn SVG
 * and any other product falls back to a neutral box in its category colors.
 */
import { useId, type ReactNode } from "react";

const PALETTES: Record<string, [string, string, string]> = {
  // [background from, background to, accent]
  Периферия: ["#eef2ff", "#dfe4ff", "#6366f1"],
  Аудио: ["#fff1f2", "#ffe0e5", "#f43f5e"],
  Аксессуары: ["#fffbeb", "#fdecc4", "#f59e0b"],
  Мониторы: ["#ecfeff", "#d3f3fb", "#0ea5e9"],
};
const DEFAULT_PALETTE: [string, string, string] = ["#f8fafc", "#e8edf3", "#64748b"];

export function paletteFor(category: string) {
  return PALETTES[category] ?? DEFAULT_PALETTE;
}

const BODY = "#1e293b";
const BODY_LIGHT = "#334155";
const KEY = "#475569";

function Shadow({ cx = 200, cy = 250, rx = 130 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={10} fill="#0f172a" opacity={0.08} />;
}

function Keyboard({ accent, retro = false }: { accent: string; retro?: boolean }) {
  const body = retro ? "#d6cfc0" : BODY;
  const key = retro ? "#ece6d8" : KEY;
  const keys: ReactNode[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 12; col++) {
      const special = !retro && ((row === 0 && col === 0) || (row === 2 && col === 11));
      keys.push(<rect key={`${row}-${col}`} x={78 + col * 21} y={118 + row * 21} width={17} height={17} rx={3.5} fill={special ? accent : key} />);
    }
  }
  return (
    <g>
      <Shadow rx={150} cy={226} />
      <rect x={62} y={104} width={276} height={112} rx={14} fill={body} />
      <rect x={62} y={104} width={276} height={8} rx={4} fill="#fff" opacity={0.08} />
      {keys}
      {retro && <circle cx={320} cy={112} r={3} fill="#8a8272" />}
    </g>
  );
}

function Mouse({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={70} cy={246} />
      <path d="M200 60c-44 0-66 36-66 86v28c0 42 28 70 66 70s66-28 66-70v-28c0-50-22-86-66-86z" fill={BODY} />
      <path d="M200 60v68" stroke="#0f172a" strokeWidth={3} />
      <path d="M134 128h132" stroke="#0f172a" strokeWidth={2} opacity={0.5} />
      <rect x={193} y={84} width={14} height={30} rx={7} fill={accent} />
      <path d="M156 90c8-14 24-22 36-24" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.15} fill="none" />
    </g>
  );
}

function Headphones({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={110} cy={250} />
      <path d="M112 170c0-62 40-104 88-104s88 42 88 104" stroke={BODY} strokeWidth={18} fill="none" strokeLinecap="round" />
      <path d="M124 160c2-48 34-80 76-80s74 32 76 80" stroke={accent} strokeWidth={4} fill="none" opacity={0.7} />
      <rect x={92} y={150} width={52} height={92} rx={24} fill={BODY} />
      <rect x={256} y={150} width={52} height={92} rx={24} fill={BODY} />
      <rect x={130} y={162} width={20} height={68} rx={10} fill={BODY_LIGHT} />
      <rect x={250} y={162} width={20} height={68} rx={10} fill={BODY_LIGHT} />
      <circle cx={118} cy={196} r={8} fill={accent} />
      <circle cx={282} cy={196} r={8} fill={accent} />
    </g>
  );
}

function Cable({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={120} cy={246} />
      <path d="M110 110c40 0 30 90 90 90s60-110 100-110" stroke="#e2e8f0" strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d="M110 110c40 0 30 90 90 90s60-110 100-110" stroke="#fff" strokeWidth={3} fill="none" opacity={0.7} />
      <g transform="translate(62 96)">
        <rect width={52} height={28} rx={8} fill={BODY} />
        <rect x={-18} y={7} width={22} height={14} rx={6} fill="#94a3b8" />
        <rect x={-14} y={11} width={14} height={6} rx={3} fill="#475569" />
        <rect x={40} y={0} width={12} height={28} rx={4} fill={accent} />
      </g>
      <g transform="translate(286 76)">
        <rect width={52} height={28} rx={8} fill={BODY} />
        <rect x={48} y={7} width={22} height={14} rx={6} fill="#94a3b8" />
        <rect x={52} y={11} width={14} height={6} rx={3} fill="#475569" />
        <rect x={0} y={0} width={12} height={28} rx={4} fill={accent} />
      </g>
    </g>
  );
}

function PowerBank({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={110} cy={238} />
      <rect x={96} y={96} width={208} height={128} rx={22} fill={BODY} />
      <rect x={96} y={96} width={208} height={10} rx={5} fill="#fff" opacity={0.08} />
      <rect x={118} y={118} width={70} height={10} rx={5} fill={BODY_LIGHT} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={132 + i * 18} cy={200} r={5} fill={i < 3 ? accent : BODY_LIGHT} />
      ))}
      <rect x={250} y={148} width={34} height={12} rx={4} fill="#0f172a" />
      <rect x={250} y={172} width={34} height={12} rx={6} fill="#0f172a" />
      <path d="M214 132l-14 26h14l-10 24 26-32h-14l10-18z" fill={accent} />
    </g>
  );
}

function Monitor({ accent, uid }: { accent: string; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.55" stopColor={accent} />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <Shadow rx={90} cy={254} />
      <rect x={176} y={196} width={48} height={44} fill={BODY_LIGHT} />
      <rect x={138} y={236} width={124} height={12} rx={6} fill={BODY} />
      <rect x={70} y={52} width={260} height={156} rx={12} fill={BODY} />
      <rect x={80} y={62} width={240} height={128} rx={6} fill={`url(#${uid}-screen)`} />
      <path d="M80 160c50-40 90 10 140-20s70-40 100-20v70H80z" fill="#fff" opacity={0.18} />
      <circle cx={270} cy={96} r={14} fill="#fff" opacity={0.35} />
      <text x={90} y={184} fontSize={11} fontWeight={700} fill="#fff" opacity={0.9} fontFamily="Manrope, sans-serif">
        4K UHD
      </text>
    </g>
  );
}

function Webcam({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={80} cy={246} />
      <path d="M170 186h60l18 52h-96z" fill={BODY_LIGHT} />
      <rect x={110} y={96} width={180} height={96} rx={48} fill={BODY} />
      <circle cx={200} cy={144} r={34} fill="#0f172a" />
      <circle cx={200} cy={144} r={24} fill="#1e3a8a" />
      <circle cx={200} cy={144} r={12} fill="#020617" />
      <circle cx={192} cy={136} r={5} fill="#fff" opacity={0.6} />
      <circle cx={258} cy={128} r={5} fill={accent} />
      <rect x={134} y={138} width={24} height={12} rx={6} fill={BODY_LIGHT} />
    </g>
  );
}

function LaptopStand({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={130} cy={244} />
      <path d="M100 236l160-100" stroke="#94a3b8" strokeWidth={10} strokeLinecap="round" />
      <path d="M300 236l-40-100" stroke="#cbd5e1" strokeWidth={10} strokeLinecap="round" />
      <path d="M92 196l196-86 12 10-196 86z" fill="#cbd5e1" />
      <g transform="rotate(-23.7 200 150)">
        <rect x={96} y={134} width={214} height={10} rx={4} fill={BODY_LIGHT} />
        <rect x={100} y={40} width={206} height={96} rx={8} fill={BODY} />
        <rect x={108} y={48} width={190} height={80} rx={4} fill={accent} opacity={0.85} />
        <rect x={120} y={62} width={80} height={8} rx={4} fill="#fff" opacity={0.6} />
        <rect x={120} y={78} width={120} height={6} rx={3} fill="#fff" opacity={0.35} />
        <rect x={120} y={90} width={100} height={6} rx={3} fill="#fff" opacity={0.35} />
      </g>
    </g>
  );
}

function Speaker({ accent }: { accent: string }) {
  const dots: ReactNode[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 9; col++) {
      dots.push(<circle key={`${row}-${col}`} cx={136 + col * 16} cy={130 + row * 14} r={3.2} fill="#0f172a" opacity={0.55} />);
    }
  }
  return (
    <g>
      <Shadow rx={120} cy={236} />
      <rect x={110} y={100} width={180} height={120} rx={60} fill={BODY} />
      <rect x={120} y={116} width={160} height={88} rx={44} fill={BODY_LIGHT} />
      {dots}
      <rect x={180} y={92} width={40} height={10} rx={5} fill={accent} />
      <rect x={130} y={100} width={140} height={6} rx={3} fill="#fff" opacity={0.08} />
    </g>
  );
}

function MonitorLamp({ accent, uid }: { accent: string; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" stopOpacity={0.9} />
          <stop offset="1" stopColor="#fde68a" stopOpacity={0} />
        </linearGradient>
      </defs>
      <Shadow rx={120} cy={250} />
      <path d="M86 92h228l40 150H46z" fill={`url(#${uid}-beam)`} />
      <rect x={70} y={112} width={260} height={112} rx={8} fill={BODY_LIGHT} opacity={0.55} />
      <rect x={82} y={122} width={236} height={92} rx={4} fill="#94a3b8" opacity={0.35} />
      <rect x={176} y={88} width={48} height={32} rx={6} fill={BODY} />
      <rect x={80} y={70} width={240} height={22} rx={11} fill={BODY} />
      <rect x={96} y={88} width={208} height={5} rx={2.5} fill="#fef3c7" />
      <circle cx={306} cy={81} r={4} fill={accent} />
    </g>
  );
}

function Gamepad({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={130} cy={246} />
      <path
        d="M130 96h140c34 0 52 22 60 60l12 54c6 28-12 42-30 42-16 0-26-12-40-32l-10-14H138l-10 14c-14 20-24 32-40 32-18 0-36-14-30-42l12-54c8-38 26-60 60-60z"
        fill={BODY}
      />
      <rect x={112} y={134} width={40} height={14} rx={4} fill={BODY_LIGHT} />
      <rect x={125} y={121} width={14} height={40} rx={4} fill={BODY_LIGHT} />
      <circle cx={276} cy={126} r={9} fill={accent} />
      <circle cx={296} cy={146} r={9} fill="#22c55e" />
      <circle cx={256} cy={146} r={9} fill="#f59e0b" />
      <circle cx={276} cy={166} r={9} fill="#ef4444" />
      <circle cx={172} cy={186} r={18} fill={BODY_LIGHT} />
      <circle cx={228} cy={186} r={18} fill={BODY_LIGHT} />
      <circle cx={172} cy={186} r={9} fill="#0f172a" />
      <circle cx={228} cy={186} r={9} fill="#0f172a" />
      <rect x={186} y={128} width={28} height={8} rx={4} fill={BODY_LIGHT} />
    </g>
  );
}

function GenericBox({ accent }: { accent: string }) {
  return (
    <g>
      <Shadow rx={100} cy={244} />
      <path d="M200 78l100 44v92l-100 44-100-44v-92z" fill="#fff" />
      <path d="M200 78l100 44-100 44-100-44z" fill="#fff" stroke="#e2e8f0" strokeWidth={2} />
      <path d="M200 166v92l-100-44v-92z" fill="#f1f5f9" />
      <path d="M150 100l100 44v28" stroke={accent} strokeWidth={10} fill="none" opacity={0.8} />
    </g>
  );
}

const BY_SKU: Record<string, (props: { accent: string; uid: string }) => ReactNode> = {
  "KB-001": ({ accent }) => <Keyboard accent={accent} />,
  "MS-002": ({ accent }) => <Mouse accent={accent} />,
  "HS-003": ({ accent }) => <Headphones accent={accent} />,
  "CB-004": ({ accent }) => <Cable accent={accent} />,
  "PB-005": ({ accent }) => <PowerBank accent={accent} />,
  "MN-006": ({ accent, uid }) => <Monitor accent={accent} uid={uid} />,
  "WC-007": ({ accent }) => <Webcam accent={accent} />,
  "ST-008": ({ accent }) => <LaptopStand accent={accent} />,
  "SP-009": ({ accent }) => <Speaker accent={accent} />,
  "LM-010": ({ accent, uid }) => <MonitorLamp accent={accent} uid={uid} />,
  "GP-011": ({ accent }) => <Gamepad accent={accent} />,
  "OL-012": ({ accent }) => <Keyboard accent={accent} retro />,
};

interface ProductArtProps {
  sku: string;
  category: string;
  className?: string;
  /** Grayscale for inactive / sold out products. */
  muted?: boolean;
}

export function ProductArt({ sku, category, className = "", muted = false }: ProductArtProps) {
  const uid = useId().replace(/:/g, "");
  const [from, to, accent] = paletteFor(category);
  const Art = BY_SKU[sku] ?? ((props) => <GenericBox accent={props.accent} />);
  return (
    <svg viewBox="0 0 400 300" className={`block h-full w-full ${muted ? "grayscale-[70%] opacity-70" : ""} ${className}`} role="img" aria-label={sku}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width={400} height={300} fill={`url(#${uid}-bg)`} />
      <circle cx={340} cy={40} r={90} fill="#fff" opacity={0.35} />
      <circle cx={40} cy={290} r={70} fill="#fff" opacity={0.25} />
      {Art({ accent, uid })}
    </svg>
  );
}
