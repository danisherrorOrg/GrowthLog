import { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   RANK SYSTEM
───────────────────────────────────────────── */
const RANKS = ['Untrained', 'Light', 'Moderate', 'Heavy', 'Peak'];

const RANK_META = {
  Peak: { color: '#e11d48', glow: 'rgba(225,29,72,0.32)', label: 'Peak', icon: '🔥', badge: 'linear-gradient(135deg,#e11d48,#f97316)', text: '#e11d48', range: 'Score 80-100' },
  Heavy: { color: '#2563eb', glow: 'rgba(37,99,235,0.25)', label: 'Heavy', icon: '⚡', badge: 'linear-gradient(135deg,#2563eb,#3b82f6)', text: '#2563eb', range: 'Score 60-79' },
  Moderate: { color: '#d97706', glow: 'rgba(217,119,6,0.28)', label: 'Moderate', icon: '📈', badge: 'linear-gradient(135deg,#d97706,#65a30d)', text: '#d97706', range: 'Score 35-59' },
  Light: { color: '#10b981', glow: 'rgba(16,185,129,0.20)', label: 'Light', icon: '💧', badge: 'linear-gradient(135deg,#10b981,#34d399)', text: '#10b981', range: 'Score 15-34' },
  Untrained: { color: '#cbd5e1', glow: 'rgba(0,0,0,0.05)', label: 'Untrained', icon: '—', badge: 'linear-gradient(135deg,#cbd5e1,#e2e8f0)', text: '#94a3b8', range: 'Score 0-14' },
};

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs'];
// NOTE: 'Cardio' removed — no SVG muscle paths map to the Cardio group.
// Add it back only when you have a dedicated Cardio card / metric UI separate from the body map.

/* ─────────────────────────────────────────────
   SVG PATH DATA — anatomically-inspired
───────────────────────────────────────────── */
const FRONT_MUSCLES = [
  // Head + Neck (non-interactive structural pieces)
  { id: 'head', path: 'M100 18 C80 18 68 30 68 45 C68 62 80 72 100 72 C120 72 132 62 132 45 C132 30 120 18 100 18Z', fill: '#e2c9b0', stroke: '#c9a87a', sw: 1.5 },
  { id: 'neck', path: 'M91 70 L109 70 L112 88 L88 88Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1.5 },

  // Shoulders (Front Delts)
  { id: 'fdelt-l', label: 'Front Delts', group: 'Shoulders', path: 'M52 90 C40 90 30 100 30 115 C30 125 36 132 45 134 L60 128 L65 105 L60 92Z' },
  { id: 'fdelt-r', label: 'Front Delts', group: 'Shoulders', path: 'M148 90 C160 90 170 100 170 115 C170 125 164 132 155 134 L140 128 L135 105 L140 92Z' },

  // Chest
  { id: 'upec-l', label: 'Upper Pecs', group: 'Chest', path: 'M65 92 L100 88 L100 115 L62 118 L60 100Z' },
  { id: 'upec-r', label: 'Upper Pecs', group: 'Chest', path: 'M135 92 L100 88 L100 115 L138 118 L140 100Z' },
  { id: 'lpec-l', label: 'Lower Pecs', group: 'Chest', path: 'M62 118 L100 115 L98 132 C85 138 70 132 63 126Z' },
  { id: 'lpec-r', label: 'Lower Pecs', group: 'Chest', path: 'M138 118 L100 115 L102 132 C115 138 130 132 137 126Z' },

  // Serratus
  { id: 'ser-l', label: 'Serratus', group: 'Core', path: 'M62 118 L66 155 L75 162 L68 125Z' },
  { id: 'ser-r', label: 'Serratus', group: 'Core', path: 'M138 118 L134 155 L125 162 L132 125Z' },

  // Abs (6 blocks)
  { id: 'abs-tl', label: 'Abs', group: 'Core', path: 'M81 132 L99 130 L99 148 L80 150Z' },
  { id: 'abs-tr', label: 'Abs', group: 'Core', path: 'M101 130 L119 132 L120 150 L101 148Z' },
  { id: 'abs-ml', label: 'Abs', group: 'Core', path: 'M80 152 L99 150 L99 168 L79 170Z' },
  { id: 'abs-mr', label: 'Abs', group: 'Core', path: 'M101 150 L120 152 L121 170 L101 168Z' },
  { id: 'abs-bl', label: 'Abs', group: 'Core', path: 'M79 172 L99 170 L99 186 L80 188Z' },
  { id: 'abs-br', label: 'Abs', group: 'Core', path: 'M101 170 L121 172 L120 188 L101 186Z' },

  // Obliques
  { id: 'obl-l', label: 'Obliques', group: 'Core', path: 'M67 155 L80 150 L80 190 L72 198 C66 182 65 168 67 155Z' },
  { id: 'obl-r', label: 'Obliques', group: 'Core', path: 'M133 155 L120 150 L120 190 L128 198 C134 182 135 168 133 155Z' },

  // Biceps
  { id: 'bic-l', label: 'Biceps', group: 'Arms', path: 'M30 136 C24 145 22 160 24 172 C26 182 34 188 42 186 L48 170 L48 140 L40 134Z' },
  { id: 'bic-r', label: 'Biceps', group: 'Arms', path: 'M170 136 C176 145 178 160 176 172 C174 182 166 188 158 186 L152 170 L152 140 L160 134Z' },

  // Forearms
  { id: 'fore-l', label: 'Forearms', group: 'Arms', path: 'M24 174 C20 190 20 208 24 222 C28 232 36 237 44 234 L48 218 L46 188 L40 178Z' },
  { id: 'fore-r', label: 'Forearms', group: 'Arms', path: 'M176 174 C180 190 180 208 176 222 C172 232 164 237 156 234 L152 218 L154 188 L160 178Z' },

  // Hip (non-interactive)
  { id: 'hip', path: 'M72 198 L100 200 L128 198 L132 215 L100 218 L68 215Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1.5 },

  // Quads
  { id: 'quad-l', label: 'Quads', group: 'Legs', path: 'M68 217 L96 218 L93 290 L72 295 C65 272 63 248 68 217Z' },
  { id: 'quad-r', label: 'Quads', group: 'Legs', path: 'M104 218 L132 217 C137 248 135 272 128 295 L107 290Z' },

  // Knees (non-interactive)
  { id: 'knee-l', path: 'M72 295 L93 290 L90 312 L73 314Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1 },
  { id: 'knee-r', path: 'M107 290 L128 295 L127 314 L110 312Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1 },

  // Calves (front)
  { id: 'calf-l', label: 'Calves', group: 'Legs', path: 'M73 315 L90 313 L88 375 L74 378 C68 357 67 335 73 315Z' },
  { id: 'calf-r', label: 'Calves', group: 'Legs', path: 'M110 313 L127 315 C133 335 132 357 126 378 L112 375Z' },

  // Feet (non-interactive)
  { id: 'foot-l', path: 'M72 378 L90 375 L92 392 L68 392Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1 },
  { id: 'foot-r', path: 'M110 375 L128 378 L132 392 L108 392Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1 },
];

const BACK_MUSCLES = [
  // Head + Neck
  { id: 'head-b', path: 'M100 18 C80 18 68 30 68 45 C68 62 80 72 100 72 C120 72 132 62 132 45 C132 30 120 18 100 18Z', fill: '#e2c9b0', stroke: '#c9a87a', sw: 1.5 },
  { id: 'neck-b', path: 'M91 70 L109 70 L112 88 L88 88Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1.5 },

  // Traps
  { id: 'trap-l', label: 'Traps', group: 'Back', path: 'M88 86 L100 90 L65 105 L52 95 L65 88Z' },
  { id: 'trap-r', label: 'Traps', group: 'Back', path: 'M112 86 L100 90 L135 105 L148 95 L135 88Z' },
  { id: 'trap-m', label: 'Traps', group: 'Back', path: 'M65 105 L100 110 L135 105 L130 126 L100 130 L70 126Z' },

  // Rear Delts
  { id: 'rdelt-l', label: 'Rear Delts', group: 'Shoulders', path: 'M52 95 L40 105 C32 115 30 128 36 138 L52 135 L65 120Z' },
  { id: 'rdelt-r', label: 'Rear Delts', group: 'Shoulders', path: 'M148 95 L160 105 C168 115 170 128 164 138 L148 135 L135 120Z' },

  // Rhomboids
  { id: 'rhom', label: 'Rhomboids', group: 'Back', path: 'M70 126 L100 130 L130 126 L130 156 L100 162 L70 156Z' },

  // Lats
  { id: 'lat-l', label: 'Lats', group: 'Back', path: 'M66 122 L100 128 L96 192 L72 200 C60 175 58 148 66 122Z' },
  { id: 'lat-r', label: 'Lats', group: 'Back', path: 'M134 122 L100 128 L104 192 L128 200 C140 175 142 148 134 122Z' },

  // Lower Back
  { id: 'lback', label: 'Lower Back', group: 'Back', path: 'M72 196 L100 192 L128 196 L128 220 L100 222 L72 220Z' },

  // Triceps
  { id: 'tri-l', label: 'Triceps', group: 'Arms', path: 'M36 138 L52 135 L50 180 L36 184 C28 168 28 152 36 138Z' },
  { id: 'tri-r', label: 'Triceps', group: 'Arms', path: 'M164 138 L148 135 L150 180 L164 184 C172 168 172 152 164 138Z' },

  // Forearms (back)
  { id: 'fore-b-l', label: 'Forearms', group: 'Arms', path: 'M34 186 L50 182 L46 228 L34 230 C26 214 26 200 34 186Z' },
  { id: 'fore-b-r', label: 'Forearms', group: 'Arms', path: 'M150 182 L166 186 C174 200 174 214 166 230 L154 228Z' },

  // Glutes
  { id: 'glute-l', label: 'Glutes', group: 'Legs', path: 'M72 222 L100 222 L98 258 C87 266 74 260 68 250 C64 242 65 232 72 222Z' },
  { id: 'glute-r', label: 'Glutes', group: 'Legs', path: 'M100 222 L128 222 C135 232 136 242 132 250 C126 260 113 266 102 258Z' },

  // Hamstrings
  { id: 'ham-l', label: 'Hamstrings', group: 'Legs', path: 'M68 252 L97 260 L94 310 L72 314 C64 292 62 272 68 252Z' },
  { id: 'ham-r', label: 'Hamstrings', group: 'Legs', path: 'M103 260 L132 252 C138 272 136 292 128 314 L106 310Z' },

  // Calves (back)
  { id: 'calf-b-l', label: 'Calves', group: 'Legs', path: 'M72 316 L94 312 L90 375 L74 378 C66 355 66 335 72 316Z' },
  { id: 'calf-b-r', label: 'Calves', group: 'Legs', path: 'M106 312 L128 316 C134 335 134 355 126 378 L110 375Z' },

  // Feet (non-interactive)
  { id: 'foot-b-l', path: 'M72 378 L90 375 L92 392 L68 392Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1 },
  { id: 'foot-b-r', path: 'M110 375 L128 378 L132 392 L108 392Z', fill: '#dbbfa0', stroke: '#c9a87a', sw: 1 },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

// FIX #3: Coerce days_ago to a number before comparisons to avoid silent
// string-vs-number bugs (e.g. "3" > 10 === false in JS).
const parseDays = (raw) => {
  if (raw === '—' || raw === null || raw === undefined) return Infinity;
  const n = Number(raw);
  return isNaN(n) ? Infinity : n;
};

const resolveRank = (group, mapping, mode) => {
  const data = mapping[group];
  if (!data) return 'Untrained';

  if (mode === 'composite') return data.rank || 'Untrained';

  if (mode === 'volume') {
    const vol = data.volume || 0;
    if (vol >= 8000) return 'Peak';
    if (vol >= 4000) return 'Heavy';
    if (vol >= 2000) return 'Moderate';
    if (vol >= 500) return 'Light';
    return 'Untrained';
  }

  if (mode === 'recency') {
    // FIX #3: use parseDays for safe coercion
    const days = parseDays(data.days_ago);
    if (days > 10) return 'Untrained';
    if (days <= 2) return 'Peak';
    if (days <= 5) return 'Heavy';
    if (days <= 7) return 'Moderate';
    return 'Light';
  }

  return 'Untrained';
};

const getProgress = (group, mapping, mode) => {
  const data = mapping[group];
  if (!data) return 0;

  if (mode === 'composite') return Math.min(100, data.score || 0);

  if (mode === 'volume') return Math.min(100, ((data.volume || 0) / 10000) * 100);

  if (mode === 'recency') {
    // FIX #4: use parseDays to avoid NaN from string days_ago
    const days = parseDays(data.days_ago);
    return Math.max(0, 100 - (Math.min(days, 10) / 10) * 100);
  }

  return 0;
};

/* ─────────────────────────────────────────────
   Tooltip
───────────────────────────────────────────── */
// FIX #2: Accept resolvedRank as a direct prop instead of re-deriving it
// inside the tooltip via a fragile synthetic mapping.
function MuscleTooltip({ tooltip, resolvedRank }) {
  if (!tooltip) return null;
  const { label, group, x, y, volume, maxWeight, sets, score, days_ago } = tooltip;

  const meta = RANK_META[resolvedRank] || RANK_META.Untrained;

  // FIX #9: Clamp tooltip position so it never overflows the viewport edges.
  const clampedLeft = Math.min(x + 18, window.innerWidth - 250);
  const clampedTop = Math.max(10, y - 80);

  return (
    <div style={{
      position: 'fixed',
      left: clampedLeft,
      top: clampedTop,
      zIndex: 9999,
      pointerEvents: 'none',
      animation: 'bmTooltipIn 0.15s ease-out both',
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.97)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${meta.color}55`,
        borderRadius: 16,
        padding: '14px 18px',
        minWidth: 210,
        boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 28px ${meta.glow}`,
      }}>
        {/* Rank badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{
            background: meta.badge,
            borderRadius: 8,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 900,
            color: 'white',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            {meta.icon} {resolvedRank}
          </div>
        </div>

        {/* Name */}
        <div style={{ fontWeight: 900, fontSize: 17, color: '#fff', marginBottom: 2 }}>{label}</div>
        <div style={{
          fontSize: 11,
          color: meta.color,
          fontWeight: 700,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {group} Group
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'COMPOSITE', value: score || 0, unit: '/ 100' },
            { label: 'SETS', value: sets || 0, unit: 'total' },
            { label: 'RECENCY', value: parseDays(days_ago) === Infinity ? '—' : parseDays(days_ago), unit: 'days ago' },
            { label: 'VOLUME', value: (volume || 0).toLocaleString(), unit: 'kg' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '8px 11px',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: 1 }}>
                {s.label}
              </div>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>
                {s.value}{' '}
                <span style={{ fontWeight: 400, fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {maxWeight > 0 && (
          <div style={{ marginTop: 9, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            <span style={{ color: '#fff' }}>{maxWeight}kg</span> max lift
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Body SVG
───────────────────────────────────────────── */
function BodySVG({ isBack, mapping, onHover, onLeave, onMouseMove, viewMode }) {
  const muscles = isBack ? BACK_MUSCLES : FRONT_MUSCLES;

  return (
    <svg
      width="210"
      height="415"
      viewBox="0 0 200 410"
      // FIX #12: Remove always-on glow filters from every path.
      // Glow is now applied only on hover via inline style toggling.
      style={{ overflow: 'visible', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.14))' }}
    >
      <defs>
        <linearGradient id="diamondFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0d9c0" />
          <stop offset="100%" stopColor="#dbbfa0" />
        </linearGradient>
        {/* FIX #12: Glow filters defined once, applied only on hover */}
        {Object.keys(RANK_META).map(rank => (
          <filter key={rank} id={`glow-${rank}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor={RANK_META[rank].color} floodOpacity="0.7" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {muscles.map((m) => {
        // Non-interactive structural piece (no label)
        if (!m.label) {
          return (
            <path
              key={m.id}
              d={m.path}
              fill={m.fill || 'url(#skinGrad)'}
              stroke={m.stroke || '#c9a87a'}
              strokeWidth={m.sw || 1.5}
            />
          );
        }

        const displayRank = resolveRank(m.group, mapping, viewMode);
        const meta = RANK_META[displayRank];
        const isPeak = displayRank === 'Peak';
        const isUnt = displayRank === 'Untrained';

        return (
          <path
            key={m.id}
            d={m.path}
            fill={isPeak ? 'url(#diamondFill)' : meta.color}
            fillOpacity={isUnt ? 0.25 : 0.65}
            stroke={isPeak ? '#e11d48' : meta.color}
            strokeWidth={1.8}
            strokeOpacity={isUnt ? 0.35 : 1}
            // FIX #12: No filter by default — applied only on hover below
            style={{ cursor: 'pointer', transition: 'fill-opacity 0.18s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.fillOpacity = '0.92';
              e.currentTarget.style.strokeWidth = '2.8';
              // FIX #12: Apply glow filter only on hover
              e.currentTarget.style.filter = `url(#glow-${displayRank})`;
              onHover({
                label: m.label,
                group: m.group,
                volume: mapping[m.group]?.volume,
                maxWeight: mapping[m.group]?.max_weight,
                sets: mapping[m.group]?.sets,
                score: mapping[m.group]?.score,
                days_ago: mapping[m.group]?.days_ago,
                rank: displayRank,
                x: e.clientX,
                y: e.clientY,
              });
            }}
            // FIX #1: onMouseMove now calls the dedicated onMouseMove prop which
            // uses a functional state update — no longer routed through onHover.
            onMouseMove={onMouseMove}
            onMouseLeave={(e) => {
              e.currentTarget.style.fillOpacity = isUnt ? '0.25' : '0.65';
              e.currentTarget.style.strokeWidth = '1.8';
              // FIX #12: Remove glow filter on mouse leave
              e.currentTarget.style.filter = '';
              onLeave();
            }}
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function BodyMapVisualizer() {
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [viewMode, setViewMode] = useState('composite'); // 'composite' | 'volume' | 'recency'

  useEffect(() => { loadMapping(); }, []);

  const loadMapping = async () => {
    try {
      const res = await API.get('/health/body-mapping');
      // FIX #6: Guard against non-object API responses
      setMapping(res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : {});
    } catch {
      toast.error('Failed to load body mapping');
    } finally {
      setLoading(false);
    }
  };

  // FIX #10: Wrap handlers in useCallback to prevent unnecessary re-renders
  // of BodySVG on every parent render cycle.
  const handleHover = useCallback((data) => {
    setTooltip(data);
    setActiveGroup(data?.group || null);
  }, []);

  const handleLeave = useCallback(() => {
    setTooltip(null);
    setActiveGroup(null);
  }, []);

  // FIX #1 + #8: Dedicated onMouseMove handler using functional state update.
  // Throttled with requestAnimationFrame to avoid excessive re-renders on
  // every pixel of mouse movement.
  const handleMouseMove = useCallback(() => {
    let rafId = null;
    return (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
        rafId = null;
      });
    };
  }, [])();

  /* ── Loading skeleton ── */
  if (loading) return (
    <div style={{ padding: '30px 0' }}>
      <div style={{
        height: 480,
        borderRadius: 24,
        background: 'rgba(13,13,13,0.04)',
        animation: 'bmPulse 1.6s infinite',
      }} />
    </div>
  );

  // Derive the resolved rank for the currently-hovered muscle so the tooltip
  // receives a pre-computed value rather than re-deriving it inside the tooltip.
  // FIX #2: Pass resolvedRank directly to MuscleTooltip.
  const tooltipRank = tooltip
    ? (tooltip.rank || resolveRank(tooltip.group, mapping, viewMode))
    : 'Untrained';

  return (
    <div style={{ padding: '0 4px' }}>
      {/* ── Shared CSS animations ── */}
      <style>{`
        @keyframes bmTooltipIn {
          from { opacity:0; transform:translateY(6px) scale(0.96); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
        @keyframes bmPulse {
          0%,100% { opacity:.5; } 50% { opacity:.9; }
        }
        .bm-card { transition: transform .2s ease, box-shadow .2s ease !important; }
        .bm-card:hover { transform: translateY(-3px) !important; }

        .legend-tooltip {
          position: absolute; top: -34px; left: 50%; transform: translateX(-50%) translateY(4px);
          background: rgba(15,23,42,0.95); color: white; padding: 5px 12px;
          border-radius: 8px; font-size: 11px; font-weight: 800; white-space: nowrap;
          pointer-events: none; opacity: 0; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100;
        }
        .legend-tooltip::after {
          content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
          border-left: 4px solid transparent; border-right: 4px solid transparent;
          border-top: 4px solid rgba(15,23,42,0.95);
        }
        .legend-pill:hover .legend-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h3 style={{
          fontSize: 26, fontWeight: 900, marginBottom: 6,
          fontFamily: 'Fraunces, Georgia, serif',
          background: 'linear-gradient(135deg,#9333ea,#e11d48,#ea580c)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          💪 Physical Dominance Map
        </h3>
        <p style={{
          fontSize: 13, color: 'rgba(13,13,13,0.5)',
          maxWidth: 420, margin: '0 auto', lineHeight: 1.7,
        }}>
          Hover any muscle to see your stats. Toggle below to change how the visualizer maps activity over the past 40 days.
        </p>

        {/* View Toggles */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {[
            { id: 'composite', label: 'Composite Score', icon: '🎯' },
            { id: 'volume', label: 'Total Volume', icon: '🏋️' },
            { id: 'recency', label: 'Days Since', icon: '⏱️' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                background: viewMode === m.id ? 'var(--ink)' : 'white',
                color: viewMode === m.id ? 'white' : 'rgba(13,13,13,0.6)',
                border: viewMode === m.id ? '1px solid var(--ink)' : '1px solid rgba(13,13,13,0.1)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8,
        padding: '14px 20px', marginBottom: 36,
        background: 'rgba(13,13,13,0.03)',
        border: '1px solid rgba(13,13,13,0.07)',
        borderRadius: 16,
      }}>
        {Object.entries(RANK_META).reverse().map(([rank, meta]) => (
          <div key={rank} className="legend-pill" style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 13px',
            background: 'white', position: 'relative',
            border: `1.5px solid ${meta.color}40`,
            borderRadius: 30,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            cursor: 'help',
          }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: rank === 'Peak' ? 'linear-gradient(135deg,#e11d48,#f97316)' : meta.color,
              boxShadow: rank !== 'Untrained' ? `0 0 6px ${meta.color}aa` : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: rank === 'Untrained' ? '#94a3b8' : meta.text }}>
              {meta.icon} {rank}
            </span>
            <div className="legend-tooltip" style={{ border: `1px solid ${meta.color}40` }}>
              {meta.range}
            </div>
          </div>
        ))}
      </div>

      {/* ── Body Maps ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 52, flexWrap: 'wrap', marginBottom: 50 }}>
        {[
          { label: 'FRONT VIEW', isBack: false },
          { label: 'BACK VIEW', isBack: true },
        ].map(({ label, isBack }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 10, fontWeight: 900, letterSpacing: 3,
              color: 'rgba(13,13,13,0.3)', marginBottom: 16,
            }}>
              {label}
            </div>
            <div style={{
              display: 'inline-block',
              background: 'white',
              border: '1.5px solid rgba(13,13,13,0.08)',
              borderRadius: 24,
              padding: '22px 30px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}>
              <BodySVG
                isBack={isBack}
                mapping={mapping}
                onHover={handleHover}
                onLeave={handleLeave}
                onMouseMove={handleMouseMove}
                viewMode={viewMode}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Muscle Group Cards ── */}
      <div style={{
        fontSize: 10, fontWeight: 900, color: 'rgba(13,13,13,0.35)',
        textAlign: 'center', marginBottom: 18, letterSpacing: 2,
      }}>
        MUSCLE GROUP BREAKDOWN
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
        {MUSCLE_GROUPS.map((group) => {
          const data = mapping[group] || {};

          // FIX #5: Cards now respect the active viewMode toggle, consistent
          // with what the body map SVG is showing.
          const displayRank = resolveRank(group, mapping, viewMode);
          const meta = RANK_META[displayRank] || RANK_META.Untrained;
          const prog = getProgress(group, mapping, viewMode);

          const vol = data.volume || 0;
          const max = data.max_weight || 0;
          const sets = data.sets || 0;
          const score = data.score || 0;
          const d_ago = data.days_ago || '—';

          const isPeak = displayRank === 'Peak';
          const isUnt = displayRank === 'Untrained';
          const isActive = activeGroup === group;

          // FIX #11: Guard RANKS.indexOf so we never render "undefined" as next rank.
          const rankIdx = RANKS.indexOf(displayRank);
          const nextRank = rankIdx >= 0 && rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;

          return (
            <div key={group} className="bm-card" style={{
              background: 'white',
              border: isActive
                ? `1.5px solid ${meta.color}88`
                : '1.5px solid rgba(13,13,13,0.07)',
              borderRadius: 18, padding: '18px 20px',
              position: 'relative', overflow: 'hidden',
              boxShadow: isActive
                ? `0 10px 36px ${meta.glow}`
                : '0 4px 16px rgba(0,0,0,0.05)',
            }}>
              {/* Rank stripe */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                background: isPeak ? 'linear-gradient(to bottom,#e11d48,#f97316)' : meta.color,
                boxShadow: `2px 0 10px ${meta.glow}`,
              }} />

              {/* Subtle background tint */}
              {!isUnt && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `radial-gradient(ellipse at top left, ${meta.color}09, transparent 60%)`,
                }} />
              )}

              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--ink)', marginBottom: 3 }}>{group}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: isPeak ? '#e11d48' : isUnt ? '#94a3b8' : meta.text,
                  }}>
                    {meta.icon} {displayRank}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(13,13,13,0.35)', letterSpacing: 1 }}>MAX LIFT</div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--ink)' }}>
                    {max} <span style={{ fontWeight: 400, fontSize: 10, color: 'rgba(13,13,13,0.4)' }}>kg</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 5, background: 'rgba(13,13,13,0.07)',
                borderRadius: 99, overflow: 'hidden', marginBottom: 14,
              }}>
                <div style={{
                  height: '100%',
                  width: `${prog}%`,
                  background: isPeak ? 'linear-gradient(to right,#e11d48,#f97316)' : meta.color,
                  borderRadius: 99,
                  boxShadow: !isUnt ? `0 0 8px ${meta.glow}` : 'none',
                  transition: 'width 1.3s cubic-bezier(.34,1.56,.64,1)',
                }} />
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'SCORE', val: score, unit: '/ 100' },
                  { label: 'SETS', val: String(sets), unit: 'x' },
                  { label: 'VOLUME', val: vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : String(vol), unit: 'kg' },
                  { label: 'RECENCY', val: parseDays(d_ago) === Infinity ? '—' : String(parseDays(d_ago)), unit: 'days' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(13,13,13,0.03)',
                    border: '1px solid rgba(13,13,13,0.05)',
                    borderRadius: 10, padding: '8px 11px',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(13,13,13,0.38)', letterSpacing: 1 }}>
                      {s.label}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--ink)' }}>
                      {s.val}{' '}
                      <span style={{ fontWeight: 400, fontSize: 9, color: 'rgba(13,13,13,0.38)' }}>
                        {s.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* FIX #11: Only render next-rank hint when nextRank is defined */}
              {!isPeak && !isUnt && nextRank && (
                <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(13,13,13,0.4)', fontWeight: 700 }}>
                  Score: {score} → {nextRank}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating tooltip — FIX #2: pass resolvedRank directly */}
      <MuscleTooltip tooltip={tooltip} resolvedRank={tooltipRank} />
    </div>
  );
}