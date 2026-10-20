import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { Skeletons, Empty, onHover, offHover, RatingBar, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = { weakness: '', description: '', severity: 3, frequency: 3, guard_system: '' };

export default function WeaknessMapTab() {
  const list = useInsightList('/insights/weaknesses', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { weakness: i.weakness, description: i.description || '', severity: i.severity || 3, frequency: i.frequency || 3, guard_system: i.guard_system || '' });
  const handleSave = () => {
    if (!form.weakness.trim()) return toast.error('Name the weakness');
    list.save('🧩 Mapped');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Remove Weakness?', message: 'This cannot be undone.', done: 'Removed' });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>🧩 Weakness / Temptation Map</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Know your vulnerabilities — rated by severity and frequency — and build guards.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px', background: '#b87333', borderColor: '#b87333' }}>+ Map Weakness</button>
      </div>
      {loading ? <Skeletons h={120} /> : items.length === 0 ? (
        <Empty icon="🧩" title="Map is empty" desc="Knowing your weaknesses is a superpower. Map them honestly and build guard systems." onAdd={openCreate} label="+ Map First Weakness" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ borderLeft: '4px solid #b87333', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(184,115,51,0.1)')} onMouseLeave={offHover()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>🧩 {item.weakness}</div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 5 }}>✎</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.45)', fontWeight: 600 }}>Severity</span>
                  <RatingBar value={item.severity || 3} color="#e05a77" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.45)', fontWeight: 600 }}>Frequency</span>
                  <RatingBar value={item.frequency || 3} color="#b87333" />
                </div>
              </div>
              {item.description && (
                <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>
                  <MarkdownRenderer content={item.description} />
                </div>
              )}
              {item.guard_system && (
                <div className="markdown-body" style={{ fontSize: 12, color: '#b87333', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  🛡 <MarkdownRenderer content={item.guard_system} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Entry' : 'Map a Weakness'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="form-group"><label className="form-label">Weakness / Temptation</label><input maxLength={300} className="form-input" value={form.weakness} onChange={e => setForm({ ...form, weakness: e.target.value })} placeholder="e.g. I cave to social pressure to say yes" /></div>
        <div className="form-group"><label className="form-label">Description — how it manifests (optional)</label><textarea maxLength={2000} className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="When does this show up? In what situations?" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Severity — {form.severity}/5</label>
            <input type="range" min={1} max={5} value={form.severity} onChange={e => setForm({ ...form, severity: +e.target.value })} style={{ width: '100%' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Frequency — {form.frequency}/5</label>
            <input type="range" min={1} max={5} value={form.frequency} onChange={e => setForm({ ...form, frequency: +e.target.value })} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="form-group"><label className="form-label">Guard System (optional)</label><textarea maxLength={1000} className="form-textarea" value={form.guard_system} onChange={e => setForm({ ...form, guard_system: e.target.value })} placeholder="What rule, system, or pre-commitment helps you resist this?" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile modal-footer" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#b87333', borderColor: '#b87333' }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Map Weakness'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="🧩" iconBg="rgba(184,115,51,0.08)" titleColor="#b87333" title={preview?.weakness} subtitle={preview && `Severity ${preview.severity}/5 · Frequency ${preview.frequency}/5`} body={preview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 24, padding: '12px 18px', background: 'rgba(184,115,51,0.05)', borderRadius: 12 }}>
          <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#b87333', fontWeight: 800, marginBottom: 8 }}>Severity</div><RatingBar value={preview.severity || 3} color="#e05a77" /></div>
          <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#b87333', fontWeight: 800, marginBottom: 8 }}>Frequency</div><RatingBar value={preview.frequency || 3} color="#b87333" /></div>
        </div>
        {preview.description && <div style={{ padding: '14px 18px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7, fontStyle: 'italic' }}><MarkdownRenderer content={preview.description} /></div></div>}
        {preview.guard_system && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 800, marginBottom: 6 }}>🛡 Guard System</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.guard_system} /></div></div>}
      </div>)} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
