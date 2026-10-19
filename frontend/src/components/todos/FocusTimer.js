const PRESETS = [
  { label: '25m', sec: 1500 },
  { label: '50m', sec: 3000 },
  { label: '15m', sec: 900 },
  { label: '5m', sec: 300 },
];

export function playZenChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // E5 Note (~659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.08);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // A5 Note (~880.00 Hz) with soft delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 1.3);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.6);
  } catch (e) {
    console.warn("Failed to play chime:", e);
  }
}

// Pomodoro widget at the top of the Action Board; the timer state lives in pages/Todos.js
export default function FocusTimer({
  focusTodo, timerSeconds, timerDuration, isTimerRunning,
  onPickDuration, onToggle, onReset, onComplete, onClear,
}) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>
      <div className="card" style={{
        marginBottom: 32,
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(248,249,250,0.8) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: focusTodo ? '1px solid rgba(201,168,76,0.3)' : '1px dashed rgba(13,13,13,0.12)',
        boxShadow: focusTodo ? '0 10px 30px rgba(201,168,76,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Top accent line if active */}
        {focusTodo && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, var(--gold) 0%, var(--sage) 100%)',
          }} />
        )}

        {!focusTodo ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0', color: 'rgba(13,13,13,0.45)' }}>
            <span style={{ fontSize: 20 }}>⏱️</span>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>
              Select a task below and click <strong>Focus</strong> to start a Pomodoro session.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Widget Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span className="pulse-dot" style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    display: isTimerRunning ? 'inline-block' : 'none',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  {isTimerRunning ? 'Focus Mode Active' : 'Focus Session Paused'}
                </div>
                <h3 style={{
                  fontSize: 16,
                  fontFamily: 'Fraunces',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  margin: 0,
                  fontStyle: 'italic',
                }}>
                  "{focusTodo.title}"
                </h3>
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    className={`btn btn-sm ${timerDuration === p.sec ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => onPickDuration(p.sec)}
                    style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20 }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Central Countdown & Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
              padding: '8px 0',
            }}>
              {/* Large Timer Display */}
              <div style={{
                fontSize: 56,
                fontFamily: 'Fraunces',
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: -1,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}>
                {(() => {
                  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
                  const s = (timerSeconds % 60).toString().padStart(2, '0');
                  return `${m}:${s}`;
                })()}
                <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'sans-serif', color: 'rgba(13,13,13,0.4)' }}>
                  / {timerDuration / 60}m
                </span>
              </div>

              {/* Control Actions */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Play / Pause */}
                <button
                  className="btn btn-primary"
                  onClick={onToggle}
                  style={{
                    borderRadius: 30,
                    padding: '10px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isTimerRunning ? 'rgba(13,13,13,0.8)' : 'var(--sage)',
                    borderColor: 'transparent',
                  }}
                >
                  {isTimerRunning ? '⏸ Pause' : '▶ Start Focus'}
                </button>

                {/* Reset */}
                <button
                  className="btn btn-outline"
                  onClick={onReset}
                  style={{
                    borderRadius: 30,
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="Reset Timer"
                >
                  ↺ Reset
                </button>

                {/* Complete Task */}
                <button
                  className="btn"
                  onClick={onComplete}
                  style={{
                    borderRadius: 30,
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(107,140,107,0.1)',
                    color: 'var(--sage)',
                    border: '1px solid rgba(107,140,107,0.2)',
                  }}
                >
                  ✓ Complete Task
                </button>

                {/* Clear Focus */}
                <button
                  className="btn btn-ghost"
                  onClick={onClear}
                  style={{
                    color: 'rgba(196,98,58,0.7)',
                    padding: '10px',
                    fontSize: 12,
                  }}
                  title="Exit Focus Mode"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>

            {/* Sleek Progress Bar */}
            <div style={{
              height: 4,
              width: '100%',
              background: 'rgba(13,13,13,0.06)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((timerDuration - timerSeconds) / timerDuration) * 100}%`,
                background: 'var(--gold)',
                transition: 'width 1s linear',
              }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
