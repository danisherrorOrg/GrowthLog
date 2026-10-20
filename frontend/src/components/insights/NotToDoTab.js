import toast from 'react-hot-toast';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';
import { Skeletons, Empty, onHover, offHover, dateLabel, PreviewModal, useInsightList } from './shared';

const EMPTY_FORM = { text: '', reason: '' };

export default function NotToDoTab() {
  const list = useInsightList('/insights/not-to-do', EMPTY_FORM);
  const { items, loading, form, setForm, editing, modal, openCreate, closeModal, saving, preview, setPreview } = list;

  const openEdit = (i) => list.openEdit(i, { text: i.text, reason: i.reason || '' });
  const handleSave = () => {
    if (!form.text.trim()) return toast.error('Describe the time-waster');
    list.save('🚷 Added');
  };
  const handleDelete = (item) => list.remove(item, { title: 'Delete item?', message: 'This cannot be undone.' });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🚷 Not-to-do List</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Recurring time-wasters to consciously eliminate.</p></div>
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Item</button>
      </div>
      {loading ? <Skeletons /> : items.length === 0 ? (
        <Empty icon="🚷" title="List is empty" desc="A not-to-do list is as powerful as a to-do list. Name your recurring traps." onAdd={openCreate} label="+ Add First Item" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setPreview(item)} className="card"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid #c4623a', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(196,98,58,0.1)')} onMouseLeave={offHover()}>
              <span style={{ fontSize: 22, marginTop: 2 }}>🚷</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{item.text}</div>
                {item.reason && <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><MarkdownRenderer content={item.reason} /></div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)} style={{ padding: 5 }}>✎</button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}><div className="modal">
        <div className="modal-header"><h3>{editing ? 'Edit Item' : 'Add Not-to-do'}</h3><button className="modal-close" onClick={closeModal}>✕</button></div>
        <div className="form-group"><label className="form-label">What's the time-waster?</label><input maxLength={200} className="form-input" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="e.g. Checking email first thing in the morning…" /></div>
        <div className="form-group"><label className="form-label">Why avoid it? (optional)</label><textarea maxLength={2000} className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Why is this a trap for you?" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile modal-footer" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add to List'}</button></div>
      </div></div>)}

      <PreviewModal item={preview} onClose={() => setPreview(null)} icon="🚷" iconBg="rgba(196,98,58,0.08)" titleColor="#c4623a" title={preview?.text} subtitle={preview && `Added ${dateLabel(preview.created_at)}`} body={preview?.reason && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={preview.reason} /></div>} />

      <ConfirmModal config={list.confirm} onClose={() => list.setConfirm(null)} />
    </>
  );
}
