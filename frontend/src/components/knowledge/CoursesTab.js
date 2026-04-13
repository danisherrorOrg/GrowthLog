import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../../utils/errors';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import ConfirmModal from '../ui/ConfirmModal';

// ── Helpers ───────────────────────────────────────────────────────────────────
const dateLabel = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };
const onHover   = (c) => (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c}`; };
const offHover  = () => (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; };
const Skeletons = ({ n = 3, h = 90 }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }} />)}</div>);
const Empty = ({ icon, title, desc, onAdd, label }) => (<div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button className="btn btn-primary" onClick={onAdd} style={{ borderRadius: 30 }}>{label}</button></div>);

const STATUS_CONFIG = {
  in_progress: { label: 'In Progress', bg: 'rgba(91,139,168,0.12)', color: '#5b8ba8' },
  completed:   { label: 'Completed',   bg: 'rgba(107,140,107,0.12)', color: 'var(--sage)' },
  dropped:     { label: 'Dropped',     bg: 'rgba(13,13,13,0.06)',    color: 'rgba(13,13,13,0.4)' },
};
function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.in_progress;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>;
}

function PreviewModal({ item, onClose, icon, iconBg, titleColor, title, subtitle, body }) {
  if (!item) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 580, padding: '32px 40px' }}>
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

export default function CoursesTab() {
  const [courses, setCourses]       = useState([]); const [crLoad, setCrLoad] = useState(true);
  const [crModal, setCrModal]       = useState(false); const [crEdit, setCrEdit] = useState(null);
  const [crForm, setCrForm]         = useState({ title: '', provider: '', hours_spent: '', status: 'in_progress', what_learned: '', started_at: '', completed_at: '' });
  const [crPreview, setCrPreview]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async (url, setter, setLoading) => {
    setLoading(true);
    try { const r = await API.get(url); setter(r.data); }
    catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load('/growth-hub/courses', setCourses, setCrLoad); }, []);
  const reloadCr = () => load('/growth-hub/courses', setCourses, setCrLoad);

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

  const openCrCreate = () => { setCrEdit(null); setCrForm({ title: '', provider: '', hours_spent: '', status: 'in_progress', what_learned: '', started_at: '', completed_at: '' }); setCrModal(true); };
  const openCrEdit   = (i) => { setCrEdit(i); setCrForm({ title: i.title, provider: i.provider||'', hours_spent: i.hours_spent||'', status: i.status||'in_progress', what_learned: i.what_learned||'', started_at: i.started_at||'', completed_at: i.completed_at||'' }); setCrModal(true); };
  const handleCrSave = () => {
    if (!crForm.title.trim()) return toast.error('Name the course');
    crudSave({ editItem: crEdit, postUrl: '/growth-hub/courses', putUrl: id => `/growth-hub/courses/${id}`, form: { ...crForm, hours_spent: +crForm.hours_spent || 0 },
      onSuccess: () => { toast.success(crEdit ? 'Updated' : '📚 Course added'); setCrModal(false); reloadCr(); }
    });
  };
  const handleCrDel = crudDel('/growth-hub/courses', reloadCr);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>📚 Courses & Learning</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Courses taken, hours invested, and what you actually learned.</p>
        </div>
        <button className="btn btn-primary" onClick={openCrCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Course</button>
      </div>

      {!crLoad && courses.length > 0 && (() => {
        const completed = courses.filter(c => c.status === 'completed').length;
        const totalHours = courses.reduce((s, c) => s + (+c.hours_spent || 0), 0);
        return (
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Courses', value: courses.length, color: '#5b8ba8' },
              { label: 'Completed', value: completed, color: 'var(--sage)' },
              { label: 'Hours Invested', value: `${totalHours.toFixed(1)}h`, color: '#8b6bc4' },
            ].map(s => (
              <div key={s.label} className="card" style={{ flex: '1 1 140px', padding: '14px 18px', borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Fraunces', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {crLoad ? <Skeletons /> : courses.length === 0 ? (
        <Empty icon="📚" title="No courses logged" desc="Track every course, book, or tutorial you invest time in." onAdd={openCrCreate} label="+ Add First Course" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {courses.map(item => (
            <div key={item.id} onClick={() => setCrPreview(item)} className="card"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid #5b8ba8', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={onHover('rgba(91,139,168,0.1)')} onMouseLeave={offHover()}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{item.title}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(13,13,13,0.45)', flexWrap: 'wrap' }}>
                  {item.provider && <span>🏫 {item.provider}</span>}
                  {item.hours_spent > 0 && <span>⏱ {item.hours_spent}h</span>}
                  {item.started_at && <span>📅 {item.started_at}</span>}
                </div>
                {item.what_learned && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.what_learned.slice(0, 120)}{item.what_learned.length > 120 ? '…' : ''}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-ghost" onClick={() => openCrEdit(item)} style={{ padding: 5 }}>✎</button>
                <button className="btn btn-sm btn-ghost" onClick={() => handleCrDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Courses Modal */}
      {crModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCrModal(false)}><div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header"><h3>{crEdit ? 'Edit Course' : 'Add Course'}</h3><button className="modal-close" onClick={() => setCrModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Course / Book title</label><input className="form-input" value={crForm.title} onChange={e => setCrForm({ ...crForm, title: e.target.value })} placeholder="e.g. The Psychology of Money…" /></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Provider</label><input className="form-input" value={crForm.provider} onChange={e => setCrForm({ ...crForm, provider: e.target.value })} placeholder="Udemy / YouTube / Book…" /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Hours invested</label><input type="number" className="form-input" value={crForm.hours_spent} onChange={e => setCrForm({ ...crForm, hours_spent: e.target.value })} placeholder="e.g. 8" min="0" step="0.5" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Status</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setCrForm({ ...crForm, status: key })}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${crForm.status === key ? cfg.color : 'rgba(13,13,13,0.1)'}`, background: crForm.status === key ? cfg.bg : 'transparent', color: crForm.status === key ? cfg.color : 'rgba(13,13,13,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Started</label><input type="date" className="form-input" value={crForm.started_at} onChange={e => setCrForm({ ...crForm, started_at: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Completed</label><input type="date" className="form-input" value={crForm.completed_at} onChange={e => setCrForm({ ...crForm, completed_at: e.target.value })} /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">What did you learn?</label><textarea className="form-textarea" value={crForm.what_learned} onChange={e => setCrForm({ ...crForm, what_learned: e.target.value })} placeholder="Key insights, frameworks, skills gained…" style={{ minHeight: 100 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setCrModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleCrSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : crEdit ? 'Save Changes' : 'Add Course'}</button></div>
      </div></div>)}

      <PreviewModal item={crPreview} onClose={() => setCrPreview(null)} icon="📚" iconBg="rgba(91,139,168,0.1)" titleColor="#5b8ba8" title={crPreview?.title} subtitle={crPreview?.provider} body={crPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusBadge status={crPreview.status} />
          {crPreview.hours_spent > 0 && <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)' }}>⏱ {crPreview.hours_spent}h invested</span>}
          {crPreview.started_at && <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)' }}>📅 {crPreview.started_at}</span>}
        </div>
        {crPreview.what_learned && <div style={{ padding: '16px 20px', background: 'rgba(91,139,168,0.06)', borderRadius: 12, borderLeft: '4px solid #5b8ba8' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: '#5b8ba8', marginBottom: 10 }}>What I learned</div>
          <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={crPreview.what_learned} /></div>
        </div>}
      </div>)} />
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
