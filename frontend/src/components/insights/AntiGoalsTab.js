import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { Skeletons, Empty, onHover, offHover, dateLabel, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = { text: '', reason: '' };

export default function AntiGoalsTab() {
  const list = useInsightList('/insights/anti-goals', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { text: i.text, reason: i.reason || '' });
  const handleSave = () => {
    if (!form.text.trim()) return toast.error('Describe what you want to avoid');
    list.save('🚫 Added');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Delete Anti-Goal?', message: `Remove "${item.text}"?` });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🚫 Anti-Goals</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Things you actively want to avoid, stop, or never become.</p></div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Anti-Goal</button>
      </div>
      {loading ? <Skeletons /> : items.length === 0 ? (
        <Empty icon="🚫" title="None defined yet" desc="Anti-goals clarify your direction by naming what you're moving away from." onAdd={openCreate} label="+ Add First Anti-Goal" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid var(--rust)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(196,98,58,0.1)')} onMouseLeave={offHover()}>
              <span style={{ fontSize: 24, marginTop: 2 }}>🚫</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{item.text}</div>
                {item.reason && <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><MarkdownRenderer content={item.reason} /></div>}
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginTop: 6, fontWeight: 500 }}>Added {dateLabel(item.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 6 }}>✎</button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 6, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Anti-Goal' : 'New Anti-Goal'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="form-group"><label className="form-label">What do you want to avoid or stop?</label><input maxLength={200} className="form-input" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="e.g. Mindless scrolling before bed…" /></div>
        <div className="form-group"><label className="form-label">Why? (optional)</label><textarea maxLength={2000} className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="What harm does it cause?" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Anti-Goal'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="🚫" iconBg="rgba(196,98,58,0.08)" titleColor="var(--rust)" title="Anti-Goal" subtitle={`Added ${preview ? dateLabel(preview.created_at) : ''}`} body={preview && (<>
        <div style={{ padding: '14px 18px', background: 'rgba(196,98,58,0.05)', borderRadius: 12, borderLeft: '4px solid var(--rust)', marginBottom: preview.reason ? 20 : 0 }}><p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{preview.text}</p></div>
        {preview.reason && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', fontWeight: 800, marginBottom: 10 }}>Why I want to avoid this</div><MarkdownRenderer content={preview.reason} /></div>}
      </>)} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
