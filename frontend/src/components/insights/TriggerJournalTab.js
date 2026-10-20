import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { localDate, Skeletons, Empty, onHover, offHover, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = () => ({ trigger: '', behavior: '', consequence: '', guard: '', date: localDate() });

export default function TriggerJournalTab() {
  const list = useInsightList('/insights/triggers', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { trigger: i.trigger, behavior: i.behavior, consequence: i.consequence || '', guard: i.guard || '', date: i.date || localDate() });
  const handleSave = () => {
    if (!form.trigger.trim() || !form.behavior.trim()) return toast.error('Trigger and behavior are required');
    list.save('🎯 Logged');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Delete Trigger?', message: 'This cannot be undone.' });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>🎯 Trigger Journal</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Situation → Behavior → Consequence → Guard system.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px', background: '#e05a77', borderColor: '#e05a77' }}>+ Log Trigger</button>
      </div>
      {loading ? <Skeletons h={110} /> : items.length === 0 ? (
        <Empty icon="🎯" title="No triggers logged" desc="Break negative cycles by naming what sets them off. Awareness is the cure." onAdd={openCreate} label="+ Log First Trigger" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ borderLeft: '4px solid #e05a77', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(224,90,119,0.1)')} onMouseLeave={offHover()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#e05a77', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 4 }}>{item.date}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>🎯 {item.trigger}</span>
                    <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>→</span>
                    <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.65)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                      <MarkdownRenderer content={item.behavior} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 5 }}>✎</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                </div>
              </div>
              {item.guard && (
                <div className="markdown-body" style={{ fontSize: 12, color: '#e05a77', fontWeight: 600, marginTop: 6, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  🛡 Guard: <MarkdownRenderer content={item.guard} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Entry' : 'Log a Trigger'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ maxWidth: 200 }} /></div>
        <div className="form-group"><label className="form-label">Trigger (the situation)</label><input maxLength={300} className="form-input" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} placeholder="e.g. When I'm stressed before a deadline…" /></div>
        <div className="form-group"><label className="form-label">Behavior (what you did)</label><textarea maxLength={500} className="form-textarea" value={form.behavior} onChange={e => setForm({ ...form, behavior: e.target.value })} placeholder="e.g. I opened YouTube and watched for 2 hours" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Consequence (what it cost) — optional</label><textarea maxLength={1000} className="form-textarea" value={form.consequence} onChange={e => setForm({ ...form, consequence: e.target.value })} placeholder="e.g. Missed the deadline, felt guilty" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Guard System (how to prevent) — optional</label><textarea maxLength={1000} className="form-textarea" value={form.guard} onChange={e => setForm({ ...form, guard: e.target.value })} placeholder="e.g. Block YouTube on days with deadlines, use Forest app" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#e05a77', borderColor: '#e05a77' }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Trigger'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="🎯" iconBg="rgba(224,90,119,0.1)" titleColor="#e05a77" title={preview?.trigger} subtitle={preview?.date} body={preview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '14px 18px', background: 'rgba(224,90,119,0.06)', borderRadius: 12, borderLeft: '4px solid #e05a77' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#e05a77', fontWeight: 800, marginBottom: 6 }}>Behavior</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.behavior} /></div></div>
        {preview.consequence && <div style={{ padding: '14px 18px', background: 'rgba(196,98,58,0.06)', borderRadius: 12, borderLeft: '4px solid var(--rust)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--rust)', fontWeight: 800, marginBottom: 6 }}>Consequence</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.consequence} /></div></div>}
        {preview.guard && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 800, marginBottom: 6 }}>🛡 Guard System</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.guard} /></div></div>}
      </div>)} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
