import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { localDate, Skeletons, Empty, onHover, offHover, dateLabel, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = () => ({ date: localDate(), what: '', why: '', outcome: '' });

export default function ProcrastinationTab() {
  const list = useInsightList('/insights/procrastination', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { date: i.date, what: i.what, why: i.why || '', outcome: i.outcome || '' });
  const handleSave = () => {
    if (!form.what.trim()) return toast.error('What did you avoid?');
    list.save('😬 Logged');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Delete entry?', message: 'This cannot be undone.' });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>😬 Procrastination Log</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>What you avoided, why, and what actually happened.</p></div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Entry</button>
      </div>
      {loading ? <Skeletons h={110} /> : items.length === 0 ? (
        <Empty icon="😬" title="Nothing logged yet" desc="Naming procrastination breaks its power." onAdd={openCreate} label="+ Log First Entry" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ borderLeft: '4px solid #c9a84c', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(201,168,76,0.1)')} onMouseLeave={offHover()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div><div style={{ fontSize: 10, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 4 }}>{dateLabel(item.date)}</div><div style={{ fontWeight: 700, fontSize: 15 }}>{item.what}</div></div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 5 }}>✎</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                </div>
              </div>
              {item.why && (
                <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  <strong>Why:</strong> <MarkdownRenderer content={item.why} />
                </div>
              )}
              {item.outcome && (
                <div className="markdown-body" style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  → <MarkdownRenderer content={item.outcome} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Entry' : 'Log Procrastination'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="form-group"><label className="form-label">Date</label><input maxLength={200} type="date" max={localDate()} className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">What did you avoid?</label><input maxLength={200} className="form-input" value={form.what} onChange={e => setForm({ ...form, what: e.target.value })} placeholder="e.g. Writing that overdue report…" /></div>
        <div className="form-group"><label className="form-label">Why? (optional)</label><textarea maxLength={2000} className="form-textarea" value={form.why} onChange={e => setForm({ ...form, why: e.target.value })} placeholder="Fear, overwhelm, distraction?" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Outcome (optional)</label><textarea maxLength={2000} className="form-textarea" value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} placeholder="Did you eventually do it? What happened?" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Entry'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="😬" iconBg="rgba(201,168,76,0.1)" titleColor="#c9a84c" title={preview?.what} subtitle={preview && dateLabel(preview.date)} body={preview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {preview.why && <div style={{ padding: '14px 18px', background: 'rgba(201,168,76,0.07)', borderRadius: 12, borderLeft: '4px solid #c9a84c' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: '#c9a84c', marginBottom: 8 }}>Why avoided</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.why} /></div></div>}
        {preview.outcome && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--sage)', marginBottom: 8 }}>Outcome</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.outcome} /></div></div>}
      </div>)} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
