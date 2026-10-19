import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { Skeletons, Empty, onHover, offHover, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = { habit: '', reason: '', started_at: '', abandoned_at: '' };

export default function HabitGraveyardTab() {
  const list = useInsightList('/insights/habit-graveyard', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { habit: i.habit, reason: i.reason || '', started_at: i.started_at || '', abandoned_at: i.abandoned_at || '' });
  const handleSave = () => {
    if (!form.habit.trim()) return toast.error('Name the habit');
    list.save('🪦 Habit laid to rest');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Remove from Graveyard?', message: `Remove "${item.habit}"?`, done: 'Removed' });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🪦 Habit Graveyard</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Habits you tried and abandoned — with the lesson learned.</p></div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Habit</button>
      </div>
      {loading ? <Skeletons h={100} /> : items.length === 0 ? (
        <Empty icon="🪦" title="Graveyard is empty" desc="Every abandoned habit holds a lesson. Bury it here so you can learn from it." onAdd={openCreate} label="+ Log First Habit" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ borderLeft: '4px solid #8b6bc4', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(139,107,196,0.12)')} onMouseLeave={offHover()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 22 }}>🪦</span><div style={{ fontWeight: 700, fontSize: 16 }}>{item.habit}</div></div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 5 }}>✎</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                </div>
              </div>
              {item.reason && <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}><MarkdownRenderer content={item.reason} /></div>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {item.started_at && <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)' }}>🌱 {item.started_at}</span>}
                {item.abandoned_at && <span style={{ fontSize: 11, color: '#8b6bc4' }}>🪦 {item.abandoned_at}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Entry' : 'Log to Graveyard'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="form-group"><label className="form-label">Habit name</label><input maxLength={200} className="form-input" value={form.habit} onChange={e => setForm({ ...form, habit: e.target.value })} placeholder="e.g. Cold showers…" /></div>
        <div className="form-group"><label className="form-label">Why did you abandon it?</label><textarea maxLength={2000} className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="What made it not stick?" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Started (optional)</label><input maxLength={200} type="date" className="form-input" value={form.started_at} onChange={e => setForm({ ...form, started_at: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Abandoned (optional)</label><input maxLength={200} type="date" className="form-input" value={form.abandoned_at} onChange={e => setForm({ ...form, abandoned_at: e.target.value })} /></div>
        </div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Bury the Habit'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="🪦" iconBg="linear-gradient(135deg,#f3eeff,#e8dcff)" titleColor="#8b6bc4" title={preview?.habit} subtitle={[preview?.started_at && `🌱 ${preview.started_at}`, preview?.abandoned_at && `🪦 ${preview.abandoned_at}`].filter(Boolean).join(' → ')} body={preview && (preview.reason ? <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#f3eeff,#ede4ff)', borderRadius: 14, border: '1px solid rgba(139,107,196,0.2)' }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b6bc4', fontWeight: 800, marginBottom: 10 }}>Why it didn't stick</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}><MarkdownRenderer content={preview.reason} /></div></div> : <p style={{ color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>No reason recorded.</p>)} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
