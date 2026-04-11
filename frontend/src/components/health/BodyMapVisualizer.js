import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const RANK_COLORS = {
  Diamond: 'url(#diamondGradient)', // Gradient ref
  Elite: '#9b5de5',                 // Purple
  Good: '#00bbf9',                  // Light Blue
  Average: '#00f5d4',               // Teal
  Weak: '#f15bb5',                  // Pinkish red
  Untrained: '#e0e0e0'              // Gray
};

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
  const getSets = (muscle) => mapping[muscle]?.sets || 0;
  const getColor = (muscle) => RANK_COLORS[getRank(muscle)];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <div className="skeleton" style={{ width: 300, height: 400, borderRadius: 20 }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, marginBottom: 4 }}>🧍 Level Mapping</h3>
        <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)' }}>Visualizing training volume over the last 30 days.</p>
      </div>

      <div className="grid-2" style={{ gap: 40, alignItems: 'center' }}>
        
        {/* Abstract Boxy SVG Body Representation */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="250" height="400" viewBox="0 0 200 400" >
            <defs>
              <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="100%" stopColor="#4facfe" />
              </linearGradient>
            </defs>
            
            {/* Base Body Outlines */}
            {/* Head (Not typically a trained muscle group, just for structure) */}
            <circle cx="100" cy="40" r="30" fill="#f0f0f0" />
            
            {/* Shoulders */}
            <rect x="35" y="80" width="35" height="35" rx="8" fill={getColor('Shoulders')} stroke="white" strokeWidth="2" />
            <rect x="130" y="80" width="35" height="35" rx="8" fill={getColor('Shoulders')} stroke="white" strokeWidth="2" />
            
            {/* Chest */}
            <rect x="75" y="80" width="50" height="40" rx="6" fill={getColor('Chest')} stroke="white" strokeWidth="2" />
            
            {/* Back (Stylized as behind chest/lats extending out) */}
            <path d="M 65 90 L 75 80 L 125 80 L 135 90 L 125 150 L 75 150 Z" fill={getColor('Back')} stroke="white" strokeWidth="2" opacity="0.6"/>

            {/* Core */}
            <rect x="75" y="125" width="50" height="50" rx="6" fill={getColor('Core')} stroke="white" strokeWidth="2" />

            {/* Arms (Biceps/Triceps area) */}
            <rect x="35" y="120" width="25" height="60" rx="10" fill={getColor('Arms')} stroke="white" strokeWidth="2" />
            <rect x="140" y="120" width="25" height="60" rx="10" fill={getColor('Arms')} stroke="white" strokeWidth="2" />

            {/* Forearms */}
            <rect x="35" y="185" width="20" height="55" rx="8" fill={getColor('Arms')} stroke="white" strokeWidth="2" />
            <rect x="145" y="185" width="20" height="55" rx="8" fill={getColor('Arms')} stroke="white" strokeWidth="2" />

            {/* Hips/Pelvis */}
            <path d="M 70 180 L 130 180 L 120 220 L 80 220 Z" fill="#f0f0f0" />

            {/* Legs (Quads/Hamstrings) */}
            <rect x="70" y="225" width="25" height="80" rx="8" fill={getColor('Legs')} stroke="white" strokeWidth="2" />
            <rect x="105" y="225" width="25" height="80" rx="8" fill={getColor('Legs')} stroke="white" strokeWidth="2" />

            {/* Calves */}
            <rect x="72" y="310" width="20" height="60" rx="6" fill={getColor('Legs')} stroke="white" strokeWidth="2" />
            <rect x="108" y="310" width="20" height="60" rx="6" fill={getColor('Legs')} stroke="white" strokeWidth="2" />

          </svg>
        </div>

        {/* Legend / Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Cardio'].map(muscle => {
            const rank = getRank(muscle);
            const sets = getSets(muscle);
            return (
              <div key={muscle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(13,13,13,0.02)', borderRadius: 12, borderLeft: `6px solid ${rank === 'Diamond' ? '#00f2fe' : RANK_COLORS[rank]}` }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{muscle}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase' }}>{sets} sets logged</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 13, textTransform: 'uppercase', color: rank === 'Diamond' ? '#00f2fe' : RANK_COLORS[rank] }}>
                  {rank}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
