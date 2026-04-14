import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

// ── Constants ────────────────────────────────────────────────────────────────
const DISTORTIONS = [
  "All-or-Nothing Thinking", "Overgeneralization", "Mental Filter",
  "Disqualifying the Positive", "Jumping to Conclusions",
  "Magnification (Catastrophizing)", "Emotional Reasoning",
  "Should Statements", "Labeling", "Personalization", "unspecified",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function shiftLabel(before, after) {
  const delta = before - after;
  if (delta >= 5)  return { text: '🚀 Major relief',    color: '#2a7a2a' };
  if (delta >= 3)  return { text: '✓ Good shift',       color: 'var(--sage)' };
  if (delta >= 1)  return { text: '~ Slight shift',     color: '#a07a10' };
  if (delta === 0) return { text: '→ No change',        color: 'rgba(13,13,13,0.4)' };
  return            { text: '↓ Got worse',              color: 'var(--rust)' };
}

function highlightText(text, query) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(201,168,76,0.35)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
      : part
  );
}

// ── Intensity visual bar ──────────────────────────────────────────────────────
function IntensityBar({ before, after }) {
  const maxVal = 10;
  const delta  = before - after;
  const shift  = shiftLabel(before, after);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Bar track */}
      <div style={{ position: 'relative', height: 8, borderRadius: 10,
        background: 'var(--mist)', overflow: 'hidden' }}>
        {/* Before bar (full width of before) */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${(before / maxVal) * 100}%`,
          background: 'rgba(196,98,58,0.25)',
          borderRadius: 10,
          transition: 'width 0.5s ease',
        }} />
        {/* After bar (overlay, green) */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${(after / maxVal) * 100}%`,
          background: after < before ? 'var(--sage)' : 'var(--rust)',
          borderRadius: 10,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Numbers + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, fontFamily: 'Fraunces', color: 'var(--rust)', fontWeight: 700 }}>
          {before}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.25)' }}>→</span>
        <span style={{ fontSize: 22, fontFamily: 'Fraunces', fontWeight: 700,
          color: after < before ? 'var(--sage)' : 'var(--rust)' }}>
          {after}
        </span>
        <span style={{
          marginLeft: 6, fontSize: 11, fontWeight: 600, padding: '2px 10px',
          borderRadius: 20, background: `${shift.color}15`, color: shift.color,
        }}>
          {shift.text}
          {delta !== 0 && ` (${delta > 0 ? '-' : '+'}${Math.abs(delta)} pts)`}
        </span>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 10, width: 100, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: 60, borderRadius: 6 }} />
      </div>
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
      </div>
      <div className="skeleton" style={{ height: 8, width: '100%', borderRadius: 10 }} />
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--rust)' }}>Delete Reframe?</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', lineHeight: 1.6, marginBottom: 24 }}>
          This reframe will be permanently removed. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn" onClick={onConfirm}
            style={{ flex: 1, background: 'var(--rust)', color: 'white', border: 'none' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview (view) modal ──────────────────────────────────────────────────────
function ReframeViewModal({ reframe, onClose, onEdit, onDelete }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 700, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(107,140,107,0.04)', borderBottom: '3px solid var(--sage)',
          padding: '18px 24px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="tag tag-mist" style={{ fontSize: 9, letterSpacing: 1 }}>TRIGGER</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                {reframe.trigger || 'Spontaneous Thought'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="tag tag-gold" style={{ fontSize: 9 }}>{reframe.distortion}</span>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
            {/* Automatic thought */}
            <div style={{ padding: 20, background: 'rgba(235,160,147,0.04)',
              borderRadius: 14, border: '1px solid rgba(235,160,147,0.1)' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--rust)',
                letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Automatic Thought</div>
              <div style={{ fontSize: 15, color: 'rgba(13,13,13,0.75)', lineHeight: 1.7 }}>
                <MarkdownRenderer content={reframe.original_thought} />
              </div>
            </div>
            {/* Rational reframe */}
            <div style={{ padding: 20, background: 'rgba(107,140,107,0.04)',
              borderRadius: 14, border: '1px solid rgba(107,140,107,0.12)' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--sage)',
                letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Rational Reframe</div>
              <div style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.7,
                fontFamily: 'Fraunces', fontStyle: 'italic' }}>
                <MarkdownRenderer content={reframe.reframe} />
              </div>
            </div>
          </div>

          {/* Intensity bar */}
          <div style={{ padding: '16px 20px', background: 'var(--mist)', borderRadius: 12 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
              color: 'rgba(13,13,13,0.4)', fontWeight: 700, marginBottom: 12 }}>
              Negative Intensity Shift
            </div>
            <IntensityBar before={reframe.feeling_before} after={reframe.feeling_after} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 10, padding: '0 24px 20px',
          borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 16,
        }}>
          <button className="btn btn-outline" onClick={onEdit} style={{ flex: 1 }}>✎ Edit Reframe</button>
          <button className="btn" onClick={onDelete}
            style={{ flex: 1, background: 'rgba(196,98,58,0.07)', color: 'var(--rust)',
              border: '1px solid rgba(196,98,58,0.18)' }}>
            ✕ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rating slider helper ──────────────────────────────────────────────────────
function RatingSlider({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 13, display: 'block', marginBottom: 8, color: 'var(--ink)', fontWeight: 500 }}>
        {label}: <span style={{ color: 'var(--sage)' }}>{value}</span>
      </label>
      <input maxLength={200} type="range" min="1" max="10"
        value={value} onChange={onChange}
        style={{ width: '100%', accentColor: 'var(--sage)' }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Reframes() {
  const [reframes, setReframes]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showAdd, setShowAdd]               = useState(false);
  const [newReframe, setNewReframe]         = useState({
    trigger: '', original_thought: '', distortion: 'unspecified',
    reframe: '', feeling_before: 5, feeling_after: 5,
  });
  const [editingReframe, setEditingReframe] = useState(null);
  const [editForm, setEditForm]             = useState({});
  const [viewingReframe, setViewingReframe] = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);

  // Filters
  const [distortionFilter, setDistortionFilter] = useState('All');
  const [search, setSearch]                     = useState('');

  const fetchReframes = async () => {
    try {
      const res = await API.get('/reframes');
      setReframes(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load reframes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReframes(); }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newReframe.original_thought.trim() || !newReframe.reframe.trim()) return;
    try {
      const res = await API.post('/reframes', newReframe);
      setReframes([res.data, ...reframes]);
      setNewReframe({ trigger: '', original_thought: '', distortion: 'unspecified', reframe: '', feeling_before: 5, feeling_after: 5 });
      setShowAdd(false);
      toast.success('Reframe solidified ✦');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save reframe'));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.original_thought?.trim() || !editForm.reframe?.trim()) return;
    try {
      const res = await API.put(`/reframes/${editingReframe.id}`, editForm);
      setReframes(reframes.map(r => r.id === editingReframe.id ? res.data : r));
      setEditingReframe(null);
      toast.success('Reframe updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update reframe'));
    }
  };

  const doDelete = async () => {
    try {
      await API.delete(`/reframes/${deleteTarget}`);
      setReframes(reframes.filter(r => r.id !== deleteTarget));
      setViewingReframe(null);
      toast.success('Reframe deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = reframes.filter(r => {
    const distMatch = distortionFilter === 'All' || r.distortion === distortionFilter;
    const q = search.toLowerCase();
    const searchMatch = !q ||
      r.trigger?.toLowerCase().includes(q) ||
      r.original_thought?.toLowerCase().includes(q) ||
      r.reframe?.toLowerCase().includes(q) ||
      r.distortion?.toLowerCase().includes(q);
    return distMatch && searchMatch;
  });

  // Distortions that have at least one reframe (for smart filter)
  const usedDistortions = [...new Set(reframes.map(r => r.distortion))];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Cognitive Reframing Studio 🧠</h2>
          <p>Challenge distortions. Rewire your perspective.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? '✕ Close Studio' : '+ New Reframe'}
        </button>
      </div>

      <div className="page-body">

        {/* ── Toolbar ── */}
        <div className="card" style={{ marginBottom: 32, padding: '14px 20px',
          display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Row 1: Distortion filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
              color: 'rgba(13,13,13,0.35)', fontWeight: 700, flexShrink: 0 }}>Distortion:</span>
            <button
              className={`btn btn-sm ${distortionFilter === 'All' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setDistortionFilter('All')}
              style={{ fontSize: 11, borderRadius: 20 }}>
              All ({reframes.length})
            </button>
            {DISTORTIONS.filter(d => d !== 'unspecified').map(d => {
              const count = reframes.filter(r => r.distortion === d).length;
              if (count === 0) return null;
              return (
                <button key={d}
                  className={`btn btn-sm ${distortionFilter === d ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setDistortionFilter(d)}
                  style={{ fontSize: 10, borderRadius: 20 }}>
                  {d} ({count})
                </button>
              );
            })}
            {reframes.some(r => r.distortion === 'unspecified') && (
              <button
                className={`btn btn-sm ${distortionFilter === 'unspecified' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDistortionFilter('unspecified')}
                style={{ fontSize: 10, borderRadius: 20 }}>
                Unspecified ({reframes.filter(r => r.distortion === 'unspecified').length})
              </button>
            )}
          </div>

          {/* Row 2: Search */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
              <input maxLength={200} className="form-input" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by trigger, thought, or reframe…"
                style={{ padding: '8px 12px 8px 32px', fontSize: 13, height: 'auto' }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, opacity: 0.35 }}>🔍</span>
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4 }}>✕</button>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.35)', whiteSpace: 'nowrap' }}>
              {filtered.length} of {reframes.length} reframe{reframes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Add form ── */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 36, border: '2px solid var(--sage)', background: 'rgba(107,140,107,0.02)' }}>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5,
              color: 'var(--sage)', marginBottom: 24, fontWeight: 700 }}>
              Cognitive Reconstruction Mode
            </h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>The external trigger</label>
                <input maxLength={200} type="text" className="form-input"
                  value={newReframe.trigger}
                  onChange={e => setNewReframe({ ...newReframe, trigger: e.target.value })}
                  placeholder="What happened in reality? (e.g. 'Received a brief email')"
                  style={{ border: 'none', borderBottom: '1px solid rgba(13,13,13,0.1)',
                    background: 'transparent', borderRadius: 0, paddingLeft: 0 }} />
              </div>

              <div className="grid-2" style={{ gap: 28 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--rust)' }}>
                    Automatic Thought (The Lie)
                  </label>
                  <textarea maxLength={2000} className="form-textarea"
                    value={newReframe.original_thought}
                    onChange={e => setNewReframe({ ...newReframe, original_thought: e.target.value })}
                    placeholder="What did your brain tell you?"
                    style={{ minHeight: 110, background: 'rgba(235,160,147,0.03)',
                      border: '1px solid rgba(235,160,147,0.12)' }}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--sage)' }}>
                    Rational Perspective (The Truth)
                  </label>
                  <textarea maxLength={2000} className="form-textarea"
                    value={newReframe.reframe}
                    onChange={e => setNewReframe({ ...newReframe, reframe: e.target.value })}
                    placeholder="How can you view this objectively?"
                    style={{ minHeight: 110, background: 'rgba(107,140,107,0.03)',
                      border: '1px solid rgba(107,140,107,0.12)',
                      fontFamily: 'Fraunces', fontStyle: 'italic' }}
                    required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Identify the distortion</label>
                  <select className="form-select" value={newReframe.distortion}
                    onChange={e => setNewReframe({ ...newReframe, distortion: e.target.value })}
                    style={{ background: 'white' }}>
                    {DISTORTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <RatingSlider label="Pre-Intensity" value={newReframe.feeling_before}
                    onChange={e => setNewReframe({ ...newReframe, feeling_before: Number(e.target.value) })} />
                  <RatingSlider label="Post-Intensity" value={newReframe.feeling_after}
                    onChange={e => setNewReframe({ ...newReframe, feeling_after: Number(e.target.value) })} />
                </div>
              </div>

              {/* Live intensity preview */}
              <div style={{ padding: '14px 18px', background: 'var(--mist)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
                  color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 10 }}>
                  Preview Intensity Shift
                </div>
                <IntensityBar before={newReframe.feeling_before} after={newReframe.feeling_after} />
              </div>

              <div style={{ paddingTop: 20, borderTop: '1px solid rgba(13,13,13,0.05)', textAlign: 'right' }}>
                <button type="submit" className="btn btn-primary"
                  style={{ borderRadius: 30, padding: '12px 32px' }}>
                  Solidify Reframe ✦
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Cards ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {filtered.map(r => (
                <ReframeCard key={r.id}
                  reframe={r}
                  search={search}
                  onClick={() => setViewingReframe(r)}
                  onEdit={() => { setEditingReframe(r); setEditForm({ ...r }); }}
                  onDelete={() => setDeleteTarget(r.id)}
                />
              ))}
            </div>

            {reframes.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🧠</div>
                <h3>Your Reframing Studio is Clear</h3>
                <p>Challenge your automatic negative thoughts to build emotional resilience.</p>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}
                  style={{ borderRadius: 30 }}>
                  Add Your First Reframe
                </button>
              </div>
            )}

            {reframes.length > 0 && filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No reframes match</h3>
                <p>
                  {search
                    ? `No reframes contain "${search}".`
                    : `No reframes with distortion "${distortionFilter}".`}
                </p>
                <button className="btn btn-outline btn-sm"
                  onClick={() => { setSearch(''); setDistortionFilter('All'); }}>
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Preview modal ── */}
      {viewingReframe && (
        <ReframeViewModal
          reframe={viewingReframe}
          onClose={() => setViewingReframe(null)}
          onEdit={() => {
            setViewingReframe(null);
            setEditingReframe(viewingReframe);
            setEditForm({ ...viewingReframe });
          }}
          onDelete={() => {
            setViewingReframe(null);
            setDeleteTarget(viewingReframe.id);
          }}
        />
      )}

      {/* ── Edit modal ── */}
      {editingReframe && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingReframe(null)}>
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>Tend to Perspective 🧠</h3>
              <button className="modal-close" onClick={() => setEditingReframe(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div className="form-group">
                <label className="form-label">The Trigger</label>
                <input maxLength={200} type="text" className="form-input" value={editForm.trigger}
                  onChange={e => setEditForm({ ...editForm, trigger: e.target.value })} />
              </div>
              <div className="grid-2" style={{ gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--rust)' }}>Automatic Thought</label>
                  <textarea maxLength={2000} className="form-textarea" value={editForm.original_thought}
                    onChange={e => setEditForm({ ...editForm, original_thought: e.target.value })}
                    style={{ minHeight: 110 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--sage)' }}>Rational Reframe</label>
                  <textarea maxLength={2000} className="form-textarea" value={editForm.reframe}
                    onChange={e => setEditForm({ ...editForm, reframe: e.target.value })}
                    style={{ minHeight: 110, fontFamily: 'Fraunces', fontStyle: 'italic' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Update Distortion</label>
                  <select className="form-select" value={editForm.distortion}
                    onChange={e => setEditForm({ ...editForm, distortion: e.target.value })}>
                    {DISTORTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <RatingSlider label="Pre-Intensity" value={editForm.feeling_before}
                    onChange={e => setEditForm({ ...editForm, feeling_before: Number(e.target.value) })} />
                  <RatingSlider label="Post-Intensity" value={editForm.feeling_after}
                    onChange={e => setEditForm({ ...editForm, feeling_after: Number(e.target.value) })} />
                </div>
              </div>

              {/* Live preview in edit mode */}
              <div style={{ padding: '14px 18px', background: 'var(--mist)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
                  color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 10 }}>
                  Intensity Shift Preview
                </div>
                <IntensityBar before={editForm.feeling_before} after={editForm.feeling_after} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingReframe(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Perspective</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      {deleteTarget && (
        <ConfirmModal onConfirm={doDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

// ── ReframeCard ───────────────────────────────────────────────────────────────
function ReframeCard({ reframe: r, search, onClick, onEdit, onDelete }) {
  return (
    <div className="card" style={{
      padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
      cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s',
    }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(13,13,13,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tag tag-mist" style={{ fontSize: 9, letterSpacing: 1 }}>TRIGGER EVENT</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {search ? highlightText(r.trigger || 'Spontaneous Thought', search) : (r.trigger || 'Spontaneous Thought')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="tag tag-gold" style={{ fontSize: 9 }}>{r.distortion}</span>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="btn btn-ghost btn-sm" style={{ opacity: 0.3 }}>✎</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="btn btn-ghost btn-sm" style={{ color: 'var(--rust)', opacity: 0.3 }}>✕</button>
        </div>
      </div>

      {/* Two panels */}
      <div className="grid-2" style={{ gap: 20 }}>
        <div style={{ padding: 20, background: 'rgba(235,160,147,0.03)',
          borderRadius: 14, border: '1px solid rgba(235,160,147,0.08)' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--rust)',
            letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Automatic Thought</div>
          <div style={{ fontSize: 14, color: 'rgba(13,13,13,0.7)', lineHeight: 1.65,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {search ? highlightText(r.original_thought, search) : <MarkdownRenderer content={r.original_thought} />}
          </div>
        </div>
        <div style={{ padding: 20, background: 'rgba(107,140,107,0.03)',
          borderRadius: 14, border: '1px solid rgba(107,140,107,0.1)' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--sage)',
            letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Rational Reframe</div>
          <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.65,
            fontFamily: 'Fraunces', fontStyle: 'italic',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {search ? highlightText(r.reframe, search) : <MarkdownRenderer content={r.reframe} />}
          </div>
        </div>
      </div>

      {/* Intensity bar */}
      <div style={{ padding: '12px 16px', background: 'var(--mist)', borderRadius: 10 }}>
        <IntensityBar before={r.feeling_before} after={r.feeling_after} />
      </div>
    </div>
  );
}
