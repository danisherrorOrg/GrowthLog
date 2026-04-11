import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const RANK_COLORS = {
  Diamond: 'url(#diamondGradient)',
  Elite: '#ff0054', // Hot Pink/Red
  Good: '#ff5400',  // Orange
  Average: '#ffbd00', // Yellow/Gold
  Weak: '#00bbf9',  // Blue
  Untrained: '#f0f0f0' // Light Gray
};

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Cardio'];

export default function BodyMapVisualizer() {
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapping();
  }, []);

  const loadMapping = async () => {
    try {
      const res = await API.get('/health/body-mapping');
      setMapping(res.data);
    } catch (err) {
      toast.error('Failed to load body mapping');
    } finally {
      setLoading(false);
    }
  };

  const getRank = (muscle) => mapping[muscle]?.rank || 'Untrained';
  const getVol = (muscle) => mapping[muscle]?.volume || 0;
  const getMax = (muscle) => mapping[muscle]?.max_weight || 0;
  const getThresholds = (muscle) => mapping[muscle]?.thresholds || {};
  const getColor = (muscle) => RANK_COLORS[getRank(muscle)];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 20 }} />
      </div>
    );
  }

  // Calculate progress to next level
  const getProgress = (muscle) => {
    const vol = getVol(muscle);
    const thres = getThresholds(muscle);
    const rank = getRank(muscle);

    if (rank === 'Diamond') return 100;
    
    let nextThres = 0;
    let prevThres = 0;
    
    if (rank === 'Untrained') nextThres = thres.Average || 1500;
    else if (rank === 'Weak') { prevThres = 0; nextThres = thres.Average; }
    else if (rank === 'Average') { prevThres = thres.Average; nextThres = thres.Good; }
    else if (rank === 'Good') { prevThres = thres.Good; nextThres = thres.Elite; }
    else if (rank === 'Elite') { prevThres = thres.Elite; nextThres = thres.Diamond; }

    const range = nextThres - prevThres;
    const current = vol - prevThres;
    return Math.min(100, Math.max(0, (current / range) * 100));
  };

  const BodySVG = ({ isBack }) => (
    <svg width="180" height="360" viewBox="0 0 200 400" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.05))' }}>
      <defs>
        <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#70d6ff" />
          <stop offset="50%" stopColor="#ff70a6" />
          <stop offset="100%" stopColor="#ffd670" />
        </linearGradient>
      </defs>
      
      {/* Head */}
      <circle cx="100" cy="40" r="25" fill="#f8f8f8" stroke="#eee" strokeWidth="1" />
      
      {/* Torso Area */}
      {isBack ? (
        <>
          <path d="M 60 70 Q 100 60 140 70 L 130 160 Q 100 170 70 160 Z" fill={getColor('Back')} stroke="white" strokeWidth="2" />
          <path d="M 80 70 L 100 130 L 120 70 Z" fill={getColor('Back')} opacity="0.4" />
          <rect x="75" y="165" width="50" height="35" rx="4" fill={getColor('Core')} stroke="white" strokeWidth="2" />
        </>
      ) : (
        <>
          <rect x="65" y="75" width="70" height="45" rx="10" fill={getColor('Chest')} stroke="white" strokeWidth="2" />
          <rect x="75" y="125" width="50" height="70" rx="8" fill={getColor('Core')} stroke="white" strokeWidth="2" />
        </>
      )}

      <rect x="35" y="75" width="30" height="30" rx="15" fill={getColor('Shoulders')} stroke="white" strokeWidth="2" />
      <rect x="135" y="75" width="30" height="30" rx="15" fill={getColor('Shoulders')} stroke="white" strokeWidth="2" />

      <rect x="38" y="110" width="24" height="60" rx="12" fill={getColor('Arms')} stroke="white" strokeWidth="2" />
      <rect x="138" y="110" width="24" height="60" rx="12" fill={getColor('Arms')} stroke="white" strokeWidth="2" />
      <rect x="40" y="175" width="20" height="50" rx="10" fill={getColor('Arms')} stroke="white" strokeWidth="2" />
      <rect x="140" y="175" width="20" height="50" rx="10" fill={getColor('Arms')} stroke="white" strokeWidth="2" />

      <path d="M 65 200 L 135 200 L 125 230 L 75 230 Z" fill={isBack ? getColor('Legs') : '#f8f8f8'} opacity={isBack ? 0.7 : 1} stroke="white" strokeWidth="2" />

      <rect x="68" y="235" width="30" height="85" rx="15" fill={getColor('Legs')} stroke="white" strokeWidth="2" />
      <rect x="102" y="235" width="30" height="85" rx="15" fill={getColor('Legs')} stroke="white" strokeWidth="2" />
      
      <rect x="72" y="325" width="22" height="55" rx="11" fill={getColor('Legs')} stroke="white" strokeWidth="2" opacity={isBack ? 1 : 0.6} />
      <rect x="106" y="325" width="22" height="55" rx="11" fill={getColor('Legs')} stroke="white" strokeWidth="2" opacity={isBack ? 1 : 0.6} />
    </svg>
  );

  return (
    <div style={{ padding: '0 10px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, fontFamily: 'Fraunces' }}>💪 Physical Progression</h3>
        <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', maxWidth: 400, margin: '0 auto' }}>
          Mapping your dominance based on total weight moved (Volume) over the last 30 days.
        </p>
      </div>

      {/* Level Legend */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 8, 
        marginBottom: 40, 
        flexWrap: 'wrap',
        background: 'rgba(13,13,13,0.03)',
        padding: '16px',
        borderRadius: 20
      }}>
        {[
          { label: 'Weak', thres: '0+', color: RANK_COLORS.Weak },
          { label: 'Average', thres: '1.5k+', color: RANK_COLORS.Average },
          { label: 'Good', thres: '6k+', color: RANK_COLORS.Good },
          { label: 'Elite', thres: '18k+', color: RANK_COLORS.Elite },
          { label: 'Diamond', thres: '40k+', color: 'linear-gradient(to right, #70d6ff, #ff70a6, #ffd670)' }
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'white', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: 11, fontWeight: 800 }}>{l.label}</span>
            <span style={{ fontSize: 9, opacity: 0.4 }}>{l.thres} kg</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(13,13,13,0.3)', marginBottom: 20, letterSpacing: 2 }}>FRONT VIEW</div>
            <BodySVG isBack={false} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(13,13,13,0.3)', marginBottom: 20, letterSpacing: 2 }}>BACK VIEW</div>
            <BodySVG isBack={true} />
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 12, fontWeight: 900, color: 'rgba(13,13,13,0.4)', textAlign: 'center', marginBottom: 24, letterSpacing: 1.5 }}>MUSCLE BREAKDOWN (KG)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {MUSCLE_GROUPS.map(muscle => {
              const rank = getRank(muscle);
              const vol = getVol(muscle);
              const max = getMax(muscle);
              const progress = getProgress(muscle);
              return (
                <div key={muscle} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '20px', 
                  background: 'white', 
                  borderRadius: 20, 
                  border: '1px solid rgba(13,13,13,0.05)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: 0, top: 0, bottom: 0, 
                    width: 6, 
                    background: rank === 'Diamond' ? 'linear-gradient(to bottom, #70d6ff, #ff70a6, #ffd670)' : RANK_COLORS[rank] 
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>{muscle}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: rank === 'Diamond' ? '#ff70a6' : RANK_COLORS[rank], textTransform: 'uppercase', letterSpacing: 1 }}>{rank}</div>
                    </div>
                    {muscle !== 'Cardio' && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.3 }}>MAX LIFT</div>
                        <div style={{ fontWeight: 900, fontSize: 14 }}>{max} <span style={{ fontWeight: 400, fontSize: 10 }}>kg</span></div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative', height: 4, width: '100%', background: 'rgba(13,13,13,0.05)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: rank === 'Diamond' ? 'linear-gradient(to right, #70d6ff, #ff70a6, #ffd670)' : RANK_COLORS[rank],
                        transition: 'width 1s ease-out'
                    }} />
                  </div>

                  <div style={{ padding: '12px 16px', background: 'rgba(13,13,13,0.02)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.5 }}>TOTAL VOLUME</span>
                    <span style={{ fontWeight: 900, fontSize: 16 }}>{vol.toLocaleString()} <span style={{ fontWeight: 500, fontSize: 11 }}>kg</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
