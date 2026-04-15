import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../../utils/errors';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';

const TABS = [
  { id: 'lessons',       label: 'Life Lessons',      icon: '🏛️', color: '#8b6bc4' },
  { id: 'future-advice', label: 'To Future Self',    icon: '⏳', color: 'var(--sage)' },
  { id: 'past-advice',   label: 'From Past Self',    icon: '🕰️', color: '#5b8ba8' },
  { id: 'regrets',       label: 'Regrets Tracker',   icon: '🌧️',  color: 'var(--rust)' },
];

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────
const dateLabel = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };
const onHover   = (c) => (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c}`; };
const offHover  = () => (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; };
const Skeletons = ({ n = 3, h = 90 }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }} />)}</div>);
const Empty = ({ icon, title, desc, onAdd, label }) => (<div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button className="btn btn-primary" onClick={onAdd} style={{ borderRadius: 30 }}>{label}</button></div>);

// ── Generic preview modal ─────────────────────────────────────────────────────
function PreviewModal({ item, onClose, icon, iconBg, titleColor, title, subtitle, body }) {
  if (!item) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
      <div className="modal modal-lg">
        <div className="modal-header" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28, background: iconBg, width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'Fraunces', fontSize: 21, color: titleColor }}>{title}</h3>
              {subtitle && <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{subtitle}</div>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {body}
      </div>
    </div>
  );
}

export default function TimeCapsule() {
  const [activeTab, setActiveTab] = useState('lessons');

  // ── Life Lessons ───────────────────────────────────────────────────────────
  const [lessons, setLessons]       = useState([]); const [lsLoad, setLsLoad] = useState(true);
  const [lsModal, setLsModal]       = useState(false); const [lsEdit, setLsEdit] = useState(null);
  const [lsForm, setLsForm]         = useState({ principle: '', context: '', date_learned: TODAY, category: '' });
  const [lsPreview, setLsPreview]   = useState(null);

  // ── Future Advice ──────────────────────────────────────────────────────────
  const [future, setFuture]         = useState([]); const [faLoad, setFaLoad] = useState(true);
  const [faModal, setFaModal]       = useState(false); const [faEdit, setFaEdit] = useState(null);
  const [faForm, setFaForm]         = useState({ content: '', target_read_date: '', target_age: '' });
  const [faPreview, setFaPreview]   = useState(null);

  // ── Past Advice ────────────────────────────────────────────────────────────
  const [past, setPast]             = useState([]); const [paLoad, setPaLoad] = useState(true);
  const [paModal, setPaModal]       = useState(false); const [paEdit, setPaEdit] = useState(null);
  const [paForm, setPaForm]         = useState({ from_age: '', content: '', applied: '' });
  const [paPreview, setPaPreview]   = useState(null);

  // ── Regrets Tracker ────────────────────────────────────────────────────────
  const [regrets, setRegrets]       = useState([]); const [reLoad, setReLoad] = useState(true);
  const [reModal, setReModal]       = useState(false); const [reEdit, setReEdit] = useState(null);
  const [reForm, setReForm]         = useState({ text: '', action_to_avoid: '', date: TODAY });
  const [rePreview, setRePreview]   = useState(null);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(null);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const load = async (url, setter, setLoading) => {
    setLoading(true);
    try { const r = await API.get(url); setter(r.data); }
    catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load('/time-capsule/life-lessons',  setLessons, setLsLoad);
    load('/time-capsule/future-advice', setFuture,  setFaLoad);
    load('/time-capsule/past-advice',   setPast,    setPaLoad);
    load('/time-capsule/regrets',       setRegrets, setReLoad);
  }, []);

  const reloadLs = () => load('/time-capsule/life-lessons',  setLessons, setLsLoad);
  const reloadFa = () => load('/time-capsule/future-advice', setFuture,  setFaLoad);
  const reloadPa = () => load('/time-capsule/past-advice',   setPast,    setPaLoad);
  const reloadRe = () => load('/time-capsule/regrets',       setRegrets, setReLoad);

  // ── Generic CRUD ───────────────────────────────────────────────────────────
  const crudSave = async ({ editItem, postUrl, putUrl, form, onSuccess }) => {
    setSaving(true);
    try {
      editItem ? await API.put(putUrl(editItem.id), form) : await API.post(postUrl, form);
      onSuccess();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed to save')); }
    finally { setSaving(false); }
  };
  const crudDel = (baseUrl, reload) => (item) => setConfirm({
    title: 'Delete?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { try { await API.delete(`${baseUrl}/${item.id}`); toast.success('Deleted'); reload(); } catch {} }
  });

  // ── Life Lessons CRUD ──────────────────────────────────────────────────────
  const openLsCreate = () => { setLsEdit(null); setLsForm({ principle: '', context: '', date_learned: TODAY, category: '' }); setLsModal(true); };
  const openLsEdit   = (i) => { setLsEdit(i); setLsForm({ principle: i.principle, context: i.context||'', date_learned: i.date_learned||TODAY, category: i.category||'' }); setLsModal(true); };
  const handleLsSave = () => {
    if (!lsForm.principle.trim()) return toast.error('Add the core principle');
    crudSave({ editItem: lsEdit, postUrl: '/time-capsule/life-lessons', putUrl: id => `/time-capsule/life-lessons/${id}`, form: lsForm,
      onSuccess: () => { toast.success(lsEdit ? 'Updated' : '🏛️ Lesson recorded'); setLsModal(false); reloadLs(); }
    });
  };
  const handleLsDel = crudDel('/time-capsule/life-lessons', reloadLs);

  // ── Future Advice CRUD ─────────────────────────────────────────────────────
  const openFaCreate = () => { setFaEdit(null); setFaForm({ content: '', target_read_date: '', target_age: '' }); setFaModal(true); };
  const openFaEdit   = (i) => { setFaEdit(i); setFaForm({ content: i.content, target_read_date: i.target_read_date||'', target_age: i.target_age||'' }); setFaModal(true); };
  const handleFaSave = () => {
    if (!faForm.content.trim()) return toast.error('Write your advice');
    crudSave({ editItem: faEdit, postUrl: '/time-capsule/future-advice', putUrl: id => `/time-capsule/future-advice/${id}`, form: { ...faForm, target_age: +faForm.target_age || null },
      onSuccess: () => { toast.success(faEdit ? 'Updated' : '⏳ Time capsule buried'); setFaModal(false); reloadFa(); }
    });
  };
  const handleFaDel = crudDel('/time-capsule/future-advice', reloadFa);

  // ── Past Advice CRUD ───────────────────────────────────────────────────────
  const openPaCreate = () => { setPaEdit(null); setPaForm({ from_age: '', content: '', applied: '' }); setPaModal(true); };
  const openPaEdit   = (i) => { setPaEdit(i); setPaForm({ from_age: i.from_age||'', content: i.content, applied: i.applied||'' }); setPaModal(true); };
  const handlePaSave = () => {
    if (!paForm.content.trim()) return toast.error('Write the advice');
    crudSave({ editItem: paEdit, postUrl: '/time-capsule/past-advice', putUrl: id => `/time-capsule/past-advice/${id}`, form: { ...paForm, from_age: +paForm.from_age || null },
      onSuccess: () => { toast.success(paEdit ? 'Updated' : '🕰️ Past advice saved'); setPaModal(false); reloadPa(); }
    });
  };
  const handlePaDel = crudDel('/time-capsule/past-advice', reloadPa);

  // ── Regrets CRUD ───────────────────────────────────────────────────────────
  const openReCreate = () => { setReEdit(null); setReForm({ text: '', action_to_avoid: '', date: TODAY }); setReModal(true); };
  const openReEdit   = (i) => { setReEdit(i); setReForm({ text: i.text, action_to_avoid: i.action_to_avoid||'', date: i.date||TODAY }); setReModal(true); };
  const handleReSave = () => {
    if (!reForm.text.trim()) return toast.error('Describe the regret');
    crudSave({ editItem: reEdit, postUrl: '/time-capsule/regrets', putUrl: id => `/time-capsule/regrets/${id}`, form: reForm,
      onSuccess: () => { toast.success(reEdit ? 'Updated' : '🌧️ Regret logged'); setReModal(false); reloadRe(); }
    });
  };
  const handleReDel = crudDel('/time-capsule/regrets', reloadRe);

  return (
    <div>


      <div className="page-body">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 32, background: 'var(--mist)', padding: 4, borderRadius: 14, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 15px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? tab.color : 'rgba(13,13,13,0.45)',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: Life Lessons
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'lessons' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🏛️ Life Lessons</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Principles and truths you've earned through experience.</p></div>
              <button className="btn btn-primary" onClick={openLsCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Extract Lesson</button>
            </div>

            {lsLoad ? <Skeletons /> : lessons.length === 0 ? (
              <Empty icon="🏛️" title="No lessons recorded" desc="Wisdom is earned, but easily forgotten. Document the truths you uncover." onAdd={openLsCreate} label="+ Add Lesson" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {lessons.map(item => (
                  <div key={item.id} onClick={() => setLsPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #8b6bc4', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(139,107,196,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        {item.category && <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'rgba(13,13,13,0.3)', marginBottom: 4 }}>{item.category}</div>}
                        <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'Fraunces', lineHeight: 1.4 }}>"{item.principle}"</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openLsEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleLsDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.context && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.context}</div>}
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginTop: 12, fontWeight: 600 }}>Earned on {dateLabel(item.date_learned)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Future Advice
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'future-advice' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>⏳ To My Future Self</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Letters, warnings, and notes sent forward in time.</p></div>
              <button className="btn btn-primary" onClick={openFaCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Send Message</button>
            </div>

            {faLoad ? <Skeletons /> : future.length === 0 ? (
              <Empty icon="⏳" title="No messages sent" desc="What do you want a 5-years-older version of yourself to remember?" onAdd={openFaCreate} label="+ Send First Message" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {future.map(item => (
                  <div key={item.id} onClick={() => setFaPreview(item)} className="card"
                    style={{ borderLeft: '4px solid var(--sage)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(107,140,107,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⏳</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--sage)', background: 'rgba(107,140,107,0.1)', padding: '4px 12px', borderRadius: 20 }}>
                          To: Me {item.target_age ? `at age ${item.target_age}` : (item.target_read_date ? `on ${dateLabel(item.target_read_date)}` : 'in the future')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openFaEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleFaDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.content}</div>
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginTop: 10, fontWeight: 600 }}>Sent out {dateLabel(item.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Past Advice
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'past-advice' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🕰️ From My Past Self</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>What your younger self would say to you now.</p></div>
              <button className="btn btn-primary" onClick={openPaCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Record Advice</button>
            </div>

            {paLoad ? <Skeletons /> : past.length === 0 ? (
              <Empty icon="🕰️" title="No past advice discovered" desc="If a younger version of you could see you now, what would they say?" onAdd={openPaCreate} label="+ Add Past Advice" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {past.map(item => (
                  <div key={item.id} onClick={() => setPaPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #5b8ba8', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(91,139,168,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>🕰️</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#5b8ba8', background: 'rgba(91,139,168,0.1)', padding: '4px 12px', borderRadius: 20 }}>
                          From: My {item.from_age ? `${item.from_age}-year-old` : 'younger'} self
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openPaEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handlePaDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{item.content}"</div>
                    {item.applied && <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 8, fontWeight: 600 }}>→ How I applied it: {item.applied}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Regrets Tracker
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'regrets' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🌧️ Regrets Tracker</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Document regrets, process them, and build systems to avoid them.</p></div>
              <button className="btn btn-primary" onClick={openReCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Regret</button>
            </div>

            {reLoad ? <Skeletons h={110} /> : regrets.length === 0 ? (
              <Empty icon="🌧️" title="No regrets logged" desc="Regrets are compasses pointing toward what you truly value." onAdd={openReCreate} label="+ Log First Regret" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {regrets.map(item => (
                  <div key={item.id} onClick={() => setRePreview(item)} className="card"
                    style={{ borderLeft: '4px solid var(--rust)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(196,98,58,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', fontWeight: 700 }}>{dateLabel(item.date)}</span>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openReEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleReDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.text}</div>
                    {item.action_to_avoid && <div style={{ fontSize: 12, color: 'var(--rust)', background: 'rgba(196,98,58,0.06)', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
                      ⚡ Action: {item.action_to_avoid.slice(0, 70)}{item.action_to_avoid.length > 70 ? '…' : ''}
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════ CREATE / EDIT MODALS ════════════ */}

      {/* Life Lessons */}
      {lsModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setLsModal(false)}><div className="modal modal-md">
        <div className="modal-header"><h3>{lsEdit ? 'Edit Lesson' : 'Extract a Life Lesson'}</h3><button className="modal-close" onClick={() => setLsModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">The Principle</label><input maxLength={200} className="form-input" value={lsForm.principle} onChange={e => setLsForm({ ...lsForm, principle: e.target.value })} placeholder="State the truth clearly…" /></div>
        <div className="form-group"><label className="form-label">Context / Backstory (optional)</label><textarea maxLength={2000} className="form-textarea" value={lsForm.context} onChange={e => setLsForm({ ...lsForm, context: e.target.value })} placeholder="How did you learn this hard truth?" style={{ minHeight: 90 }} /></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date Learned</label><input maxLength={200} type="date" className="form-input" value={lsForm.date_learned} onChange={e => setLsForm({ ...lsForm, date_learned: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Category</label><input maxLength={200} className="form-input" value={lsForm.category} onChange={e => setLsForm({ ...lsForm, category: e.target.value })} placeholder="Career / Money / Love…" /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button className="btn btn-outline" onClick={() => setLsModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleLsSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : lsEdit ? 'Save Changes' : 'Record Truth'}</button></div>
      </div></div>)}

      {/* Future Advice */}
      {faModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setFaModal(false)}><div className="modal modal-md">
        <div className="modal-header"><h3>{faEdit ? 'Edit Message' : 'Send to Future Self'}</h3><button className="modal-close" onClick={() => setFaModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">The Message</label><textarea maxLength={2000} className="form-textarea" value={faForm.content} onChange={e => setFaForm({ ...faForm, content: e.target.value })} placeholder="Write your letter, warning, or reminder…" style={{ minHeight: 120 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Target Reading Age (optional)</label><input maxLength={200} type="number" className="form-input" value={faForm.target_age} onChange={e => setFaForm({ ...faForm, target_age: e.target.value })} placeholder="e.g. 50" /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Or Target Date (optional)</label><input maxLength={200} type="date" className="form-input" value={faForm.target_read_date} onChange={e => setFaForm({ ...faForm, target_read_date: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button className="btn btn-outline" onClick={() => setFaModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleFaSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : faEdit ? 'Save Changes' : 'Bury Capsule'}</button></div>
      </div></div>)}

      {/* Past Advice */}
      {paModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPaModal(false)}><div className="modal modal-md">
        <div className="modal-header"><h3>{paEdit ? 'Edit Advice' : 'Advice from Past Self'}</h3><button className="modal-close" onClick={() => setPaModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">From what age? (optional)</label><input maxLength={200} type="number" className="form-input" style={{ width: 100 }} value={paForm.from_age} onChange={e => setPaForm({ ...paForm, from_age: e.target.value })} placeholder="e.g. 21" /></div>
        <div className="form-group"><label className="form-label">What would they say to you now?</label><textarea maxLength={2000} className="form-textarea" value={paForm.content} onChange={e => setPaForm({ ...paForm, content: e.target.value })} placeholder="What did you want back then? Are you honoring them?" style={{ minHeight: 100 }} /></div>
        <div className="form-group"><label className="form-label">How are you applying it today? (optional)</label><textarea maxLength={2000} className="form-textarea" value={paForm.applied} onChange={e => setPaForm({ ...paForm, applied: e.target.value })} placeholder="Integrating their wisdom into my reality by…" style={{ minHeight: 70 }} /></div>
        <div style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setPaModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handlePaSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : paEdit ? 'Save Changes' : 'Record Advice'}</button></div>
      </div></div>)}

      {/* Regrets Tracker */}
      {reModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReModal(false)}><div className="modal modal-md">
        <div className="modal-header"><h3>{reEdit ? 'Edit Regret' : 'Log a Regret'}</h3><button className="modal-close" onClick={() => setReModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">The Regret</label><textarea maxLength={2000} className="form-textarea" value={reForm.text} onChange={e => setReForm({ ...reForm, text: e.target.value })} placeholder="I regret not..." style={{ minHeight: 80 }} /></div>
        <div className="form-group"><label className="form-label">The Strategy</label><textarea maxLength={2000} className="form-textarea" value={reForm.action_to_avoid} onChange={e => setReForm({ ...reForm, action_to_avoid: e.target.value })} placeholder="What is the precise action you will take to NEVER feel this way again?" style={{ minHeight: 80 }} /></div>
        <div className="form-group"><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={reForm.date} onChange={e => setReForm({ ...reForm, date: e.target.value })} style={{ maxWidth: 180 }} /></div>
        <div style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setReModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleReSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : reEdit ? 'Save Changes' : 'Log Regret'}</button></div>
      </div></div>)}

      {/* ════════════ PREVIEW MODALS ════════════ */}

      <PreviewModal item={lsPreview} onClose={() => setLsPreview(null)} icon="🏛️" iconBg="rgba(139,107,196,0.1)" titleColor="#8b6bc4" title="Life Lesson" subtitle={lsPreview ? `Earned ${dateLabel(lsPreview.date_learned)}` : ''} body={lsPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 24, lineHeight: 1.4, fontFamily: 'Fraunces', fontWeight: 800, color: '#8b6bc4' }}>"{lsPreview.principle}"</p>
        {lsPreview.context && <div style={{ padding: '16px 20px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>The Context</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{lsPreview.context}</p></div>}
      </div>)} />

      <PreviewModal item={faPreview} onClose={() => setFaPreview(null)} icon="⏳" iconBg="rgba(107,140,107,0.1)" titleColor="var(--sage)" title={`To: My Future Self ${faPreview?.target_age ? `(Age ${faPreview.target_age})` : ''}`} subtitle={faPreview ? `Written ${dateLabel(faPreview.created_at)}` : ''} body={faPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="markdown-body" style={{ padding: '18px 22px', background: 'rgba(107,140,107,0.05)', borderRadius: 12, borderLeft: '4px solid var(--sage)', fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={faPreview.content} /></div>
      </div>)} />

      <PreviewModal item={paPreview} onClose={() => setPaPreview(null)} icon="🕰️" iconBg="rgba(91,139,168,0.1)" titleColor="#5b8ba8" title={`From: My Past Self ${paPreview?.from_age ? `(Age ${paPreview.from_age})` : ''}`} subtitle={paPreview ? `Captured ${dateLabel(paPreview.created_at)}` : ''} body={paPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, fontStyle: 'italic', fontWeight: 500 }}>"{paPreview.content}"</p>
        {paPreview.applied && <div style={{ padding: '16px 20px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'rgba(13,13,13,0.4)', marginBottom: 8 }}>Application</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{paPreview.applied}</p></div>}
      </div>)} />

      <PreviewModal item={rePreview} onClose={() => setRePreview(null)} icon="🌧️" iconBg="rgba(196,98,58,0.1)" titleColor="var(--rust)" title="Regret Log" subtitle={rePreview ? dateLabel(rePreview.date) : ''} body={rePreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 500 }}>{rePreview.text}</p>
        <div style={{ padding: '16px 20px', background: 'rgba(196,98,58,0.06)', borderRadius: 12, borderLeft: '4px solid var(--rust)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--rust)', marginBottom: 8 }}>Action strategy to avoid repeat</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, fontWeight: 600 }}>{rePreview.action_to_avoid || 'No strategy defined.'}</p></div>
      </div>)} />

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
