import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { localDate, Skeletons, Empty, onHover, offHover, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = () => ({ decision: '', what_went_wrong: '', root_cause: '', do_differently: '', domain: 'General', date: localDate() });

export default function BadDecisionsTab() {
  const list = useInsightList('/insights/bad-decisions', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { decision: i.decision, what_went_wrong: i.what_went_wrong || '', root_cause: i.root_cause || '', do_differently: i.do_differently || '', domain: i.domain || 'General', date: i.date || localDate() });
  const handleSave = () => {
    if (!form.decision.trim()) return toast.error('Describe the decision');
    list.save('💀 Logged');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Delete entry?', message: 'This cannot be undone.' });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>💀 Bad Decision Journal</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Post-mortem your poor choices — process, not just outcome.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px', background: '#7a5c8a', borderColor: '#7a5c8a' }}>+ Log Decision</button>
      </div>
      {loading ? <Skeletons h={110} /> : items.length === 0 ? (
        <Empty icon="💀" title="No decisions logged" desc="The best investors keep a decision journal. Start yours — every bad call is a lesson." onAdd={openCreate} label="+ Log First Decision" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ borderLeft: '4px solid #7a5c8a', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(122,92,138,0.1)')} onMouseLeave={offHover()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(122,92,138,0.1)', color: '#7a5c8a', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.domain}</span>
                    <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)' }}>{item.date}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{item.decision}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 5 }}>✎</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                </div>
              </div>
              {item.what_went_wrong && (
                <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  <MarkdownRenderer content={item.what_went_wrong} />
                </div>
              )}
              {item.do_differently && (
                <div className="markdown-body" style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  → <MarkdownRenderer content={item.do_differently} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Entry' : 'Log a Bad Decision'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Domain</label>
            <select className="form-input" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}>
              {['General', 'Work', 'Finance', 'Health', 'Relationships', 'Personal Growth', 'Business', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">The Decision</label><input maxLength={300} className="form-input" value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })} placeholder="e.g. Skipped due diligence and invested impulsively" /></div>
        <div className="form-group"><label className="form-label">What went wrong?</label><textarea maxLength={2000} className="form-textarea" value={form.what_went_wrong} onChange={e => setForm({ ...form, what_went_wrong: e.target.value })} placeholder="Describe the outcome and how it played out" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Root cause (optional)</label><textarea maxLength={1000} className="form-textarea" value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} placeholder="Fear, ego, lot of information, peer pressure?" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">What would you do differently? (optional)</label><textarea maxLength={1000} className="form-textarea" value={form.do_differently} onChange={e => setForm({ ...form, do_differently: e.target.value })} placeholder="The rule or system you'd follow next time" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#7a5c8a', borderColor: '#7a5c8a' }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Decision'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="💀" iconBg="rgba(122,92,138,0.08)" titleColor="#7a5c8a" title={preview?.decision} subtitle={preview && `${preview.domain} · ${preview.date}`} body={preview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {preview.what_went_wrong && <div style={{ padding: '14px 18px', background: 'rgba(122,92,138,0.06)', borderRadius: 12, borderLeft: '4px solid #7a5c8a' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#7a5c8a', fontWeight: 800, marginBottom: 6 }}>What went wrong</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.what_went_wrong} /></div></div>}
        {preview.root_cause && <div style={{ padding: '14px 18px', background: 'rgba(201,168,76,0.06)', borderRadius: 12, borderLeft: '4px solid var(--gold)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)', fontWeight: 800, marginBottom: 6 }}>Root Cause</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.root_cause} /></div></div>}
        {preview.do_differently && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 800, marginBottom: 6 }}>→ Next Time</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={preview.do_differently} /></div></div>}
      </div>)} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
