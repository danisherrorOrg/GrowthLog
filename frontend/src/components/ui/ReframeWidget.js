import React from 'react';

export default function ReframeWidget({ original, reframe, distortion }) {
  return (
    <div className="card" style={{ padding: 16, background: 'var(--paper)', border: '1px solid rgba(13,13,13,0.1)' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 4 }}>Cognitive Distortion: {distortion || 'unspecified'}</div>
      <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', textDecoration: 'line-through', marginBottom: 8 }}>{original}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, borderLeft: '3px solid var(--sage)', paddingLeft: 8 }}>{reframe}</div>
    </div>
  );
}
