import { useEffect, useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

// ── Tab config ────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    label: '📈 Learning & Growth',
    tabs: [
      { id: 'skills', label: 'Skills', icon: '📈', color: 'var(--sage)' },
      { id: 'failures', label: 'Failure Log', icon: '💥', color: '#c9a84c' },
    ],
  },
  {
    label: '💼 Career & Work',
    tabs: [
      { id: 'skillsgap', label: 'Skills Gap', icon: '🎯', color: '#8b6bc4' },
      { id: 'feedback', label: 'Feedback Received', icon: '💬', color: '#c4623a' },
    ],
  },
];

const ALL_TABS = SECTIONS.flatMap(s => s.tabs);
const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────
const dateLabel = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };
const onHover = (c) => (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c}`; };
const offHover = () => (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; };
const Skeletons = ({ n = 3, h = 90 }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }} />)}</div>);
const Empty = ({ icon, title, desc, onAdd, label }) => (<div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button className="btn btn-primary" onClick={onAdd} style={{ borderRadius: 30 }}>{label}</button></div>);

// ── Skill level display ────────────────────────────────────────────────────────
const LEVEL_LABELS = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
const LEVEL_COLORS = ['', '#9ca3af', '#6b8c6b', '#5b8ba8', '#8b6bc4', '#c9a84c'];

function LevelDots({ level, size = 10 }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{ width: size, height: size, borderRadius: '50%', background: n <= level ? LEVEL_COLORS[level] : 'rgba(13,13,13,0.08)', transition: 'background 0.2s' }} />
      ))}
      <span style={{ fontSize: size - 2, color: LEVEL_COLORS[level], fontWeight: 700, marginLeft: 4 }}>{LEVEL_LABELS[level]}</span>
    </div>
  );
}


// ── Feedback type badge ────────────────────────────────────────────────────────
const FB_CONFIG = {
  positive: { label: '👍 Positive', bg: 'rgba(107,140,107,0.1)', color: 'var(--sage)', border: 'var(--sage)' },
  critical: { label: '⚡ Critical', bg: 'rgba(196,98,58,0.08)', color: 'var(--rust)', border: 'var(--rust)' },
  mixed: { label: '⚖️ Mixed', bg: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '#c9a84c' },
};
function FeedbackBadge({ type }) {
  const f = FB_CONFIG[type] || FB_CONFIG.positive;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: f.bg, color: f.color, border: `1px solid ${f.border}44` }}>{f.label}</span>;
}

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

export default function GrowthHub() {
  const [activeTab, setActiveTab] = useState('skills');

  // ── Skills ─────────────────────────────────────────────────────────────────
  const [skills, setSkills] = useState([]); const [skLoad, setSkLoad] = useState(true);
  const [skModal, setSkModal] = useState(false); const [skEdit, setSkEdit] = useState(null);
  const [skForm, setSkForm] = useState({ name: '', category: '', level: 1, notes: '', started_at: '' });
  const [skPreview, setSkPreview] = useState(null);

  // ── Courses ────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]); const [crLoad, setCrLoad] = useState(true);
  const [crModal, setCrModal] = useState(false); const [crEdit, setCrEdit] = useState(null);
  const [crForm, setCrForm] = useState({ title: '', provider: '', hours_spent: '', status: 'in_progress', what_learned: '', started_at: '', completed_at: '' });
  const [crPreview, setCrPreview] = useState(null);

  // ── Failure Log ────────────────────────────────────────────────────────────
  const [failures, setFailures] = useState([]); const [flLoad, setFlLoad] = useState(true);
  const [flModal, setFlModal] = useState(false); const [flEdit, setFlEdit] = useState(null);
  const [flForm, setFlForm] = useState({ date: TODAY, what_happened: '', lesson: '', domain: '' });
  const [flPreview, setFlPreview] = useState(null);

  // ── Skills Gap ─────────────────────────────────────────────────────────────
  const [gaps, setGaps] = useState([]); const [sgLoad, setSgLoad] = useState(true);
  const [sgModal, setSgModal] = useState(false); const [sgEdit, setSgEdit] = useState(null);
  const [sgForm, setSgForm] = useState({ skill: '', current_level: '', target_level: '', why_needed: '', resources: '' });
  const [sgPreview, setSgPreview] = useState(null);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [feedbacks, setFeedbacks] = useState([]); const [fbLoad, setFbLoad] = useState(true);
  const [fbModal, setFbModal] = useState(false); const [fbEdit, setFbEdit] = useState(null);
  const [fbForm, setFbForm] = useState({ date: TODAY, from_person: '', feedback_type: 'positive', content: '', action_taken: '' });
  const [fbPreview, setFbPreview] = useState(null);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const load = async (url, setter, setLoading) => {
    setLoading(true);
    try { const r = await API.get(url); setter(r.data); }
    catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load('/growth-hub/skills', setSkills, setSkLoad);
    load('/growth-hub/failures', setFailures, setFlLoad);
    load('/growth-hub/skills-gap', setGaps, setSgLoad);
    load('/growth-hub/feedback', setFeedbacks, setFbLoad);
  }, []);

  const reloadSk = () => load('/growth-hub/skills', setSkills, setSkLoad);
  const reloadFl = () => load('/growth-hub/failures', setFailures, setFlLoad);
  const reloadSg = () => load('/growth-hub/skills-gap', setGaps, setSgLoad);
  const reloadFb = () => load('/growth-hub/feedback', setFeedbacks, setFbLoad);

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
    onConfirm: async () => { try { await API.delete(`${baseUrl}/${item.id}`); toast.success('Deleted'); reload(); } catch { } }
  });

  // ── Skills CRUD ────────────────────────────────────────────────────────────
  const openSkCreate = () => { setSkEdit(null); setSkForm({ name: '', category: '', level: 1, notes: '', started_at: '' }); setSkModal(true); };
  const openSkEdit = (i) => { setSkEdit(i); setSkForm({ name: i.name, category: i.category || '', level: i.level || 1, notes: i.notes || '', started_at: i.started_at || '' }); setSkModal(true); };
  const handleSkSave = () => {
    if (!skForm.name.trim()) return toast.error('Name the skill');
    crudSave({
      editItem: skEdit, postUrl: '/growth-hub/skills', putUrl: id => `/growth-hub/skills/${id}`, form: { ...skForm, level: +skForm.level },
      onSuccess: () => { toast.success(skEdit ? 'Updated' : '📈 Skill added'); setSkModal(false); reloadSk(); }
    });
  };
  const handleSkDel = crudDel('/growth-hub/skills', reloadSk);


  // ── Failure Log CRUD ───────────────────────────────────────────────────────
  const openFlCreate = () => { setFlEdit(null); setFlForm({ date: TODAY, what_happened: '', lesson: '', domain: '' }); setFlModal(true); };
  const openFlEdit = (i) => { setFlEdit(i); setFlForm({ date: i.date || TODAY, what_happened: i.what_happened, lesson: i.lesson || '', domain: i.domain || '' }); setFlModal(true); };
  const handleFlSave = () => {
    if (!flForm.what_happened.trim()) return toast.error('Describe what happened');
    crudSave({
      editItem: flEdit, postUrl: '/growth-hub/failures', putUrl: id => `/growth-hub/failures/${id}`, form: flForm,
      onSuccess: () => { toast.success(flEdit ? 'Updated' : '💥 Entry logged'); setFlModal(false); reloadFl(); }
    });
  };
  const handleFlDel = crudDel('/growth-hub/failures', reloadFl);

  // ── Skills Gap CRUD ────────────────────────────────────────────────────────
  const openSgCreate = () => { setSgEdit(null); setSgForm({ skill: '', current_level: '', target_level: '', why_needed: '', resources: '' }); setSgModal(true); };
  const openSgEdit = (i) => { setSgEdit(i); setSgForm({ skill: i.skill, current_level: i.current_level || '', target_level: i.target_level || '', why_needed: i.why_needed || '', resources: i.resources || '' }); setSgModal(true); };
  const handleSgSave = () => {
    if (!sgForm.skill.trim()) return toast.error('Name the skill');
    crudSave({
      editItem: sgEdit, postUrl: '/growth-hub/skills-gap', putUrl: id => `/growth-hub/skills-gap/${id}`, form: sgForm,
      onSuccess: () => { toast.success(sgEdit ? 'Updated' : '🎯 Gap added'); setSgModal(false); reloadSg(); }
    });
  };
  const handleSgDel = crudDel('/growth-hub/skills-gap', reloadSg);

  // ── Feedback CRUD ──────────────────────────────────────────────────────────
  const openFbCreate = () => { setFbEdit(null); setFbForm({ date: TODAY, from_person: '', feedback_type: 'positive', content: '', action_taken: '' }); setFbModal(true); };
  const openFbEdit = (i) => { setFbEdit(i); setFbForm({ date: i.date || TODAY, from_person: i.from_person || '', feedback_type: i.feedback_type || 'positive', content: i.content, action_taken: i.action_taken || '' }); setFbModal(true); };
  const handleFbSave = () => {
    if (!fbForm.content.trim()) return toast.error('Enter the feedback');
    crudSave({
      editItem: fbEdit, postUrl: '/growth-hub/feedback', putUrl: id => `/growth-hub/feedback/${id}`, form: fbForm,
      onSuccess: () => { toast.success(fbEdit ? 'Updated' : '💬 Feedback logged'); setFbModal(false); reloadFb(); }
    });
  };
  const handleFbDel = crudDel('/growth-hub/feedback', reloadFb);

  const currentTab = ALL_TABS.find(t => t.id === activeTab);

  return (
    <div>
      <div className="page-header">
        <h2>Growth Hub 🚀</h2>
        <p>Track skills, document learning, log failures, and capture the feedback that shapes your career.</p>
      </div>

      <div className="page-body">
        {/* ── Grouped tab nav ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
          {SECTIONS.map(section => (
            <div key={section.label}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'rgba(13,13,13,0.3)', marginBottom: 8 }}>{section.label}</div>
              <div style={{ display: 'flex', gap: 5, background: 'var(--mist)', padding: 4, borderRadius: 12 }}>
                {section.tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
                    background: activeTab === tab.id ? 'white' : 'transparent',
                    color: activeTab === tab.id ? tab.color : 'rgba(13,13,13,0.45)',
                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: Skills Tracker
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'skills' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>📈 Skills Tracker</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Track skills you're developing and your current proficiency level.</p></div>
              <button className="btn btn-primary" onClick={openSkCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Skill</button>
            </div>

            {skLoad ? <Skeletons /> : skills.length === 0 ? (
              <Empty icon="📈" title="No skills tracked yet" desc="Start logging the skills you're actively developing." onAdd={openSkCreate} label="+ Add First Skill" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {skills.map(item => (
                  <div key={item.id} onClick={() => setSkPreview(item)} className="card"
                    style={{ borderLeft: `4px solid ${LEVEL_COLORS[item.level] || 'var(--sage)'}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(107,140,107,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        {item.category && <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'rgba(13,13,13,0.35)', marginBottom: 4 }}>{item.category}</div>}
                        <div style={{ fontWeight: 700, fontSize: 17 }}>{item.name}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openSkEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleSkDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    <LevelDots level={item.level || 1} />
                    {item.started_at && <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginTop: 10 }}>🌱 Started {item.started_at}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Courses & Learning
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, marginBottom: 4 }}>📚 Courses & Learning</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Courses taken, hours invested, and what you actually learned.</p>
              </div>
              <button className="btn btn-primary" onClick={openCrCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Course</button>
            </div>

            {/* Summary stats */}
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
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Failure Log
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'failures' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>💥 Failure Log</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Every mistake is tuition. Record what happened and what you extracted from it.</p></div>
              <button className="btn btn-primary" onClick={openFlCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Failure</button>
            </div>

            {flLoad ? <Skeletons h={110} /> : failures.length === 0 ? (
              <Empty icon="💥" title="No failures logged" desc="Failures are data points. Logging them builds pattern recognition." onAdd={openFlCreate} label="+ Log First Failure" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {failures.map(item => (
                  <div key={item.id} onClick={() => setFlPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #c9a84c', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(201,168,76,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>{dateLabel(item.date)}</span>
                          {item.domain && <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', background: 'var(--mist)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{item.domain}</span>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.what_happened}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openFlEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleFlDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.lesson && <div style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 600, marginTop: 8, borderTop: '1px solid rgba(13,13,13,0.06)', paddingTop: 8 }}>
                      💡 {item.lesson.slice(0, 100)}{item.lesson.length > 100 ? '…' : ''}
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Skills Gap Tracker
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'skillsgap' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🎯 Skills Gap Tracker</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Skills you need for your next career move — and your plan to close the gap.</p></div>
              <button className="btn btn-primary" onClick={openSgCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Gap</button>
            </div>

            {sgLoad ? <Skeletons /> : gaps.length === 0 ? (
              <Empty icon="🎯" title="No gaps identified" desc="Knowing your skill gaps is the first step to closing them." onAdd={openSgCreate} label="+ Add First Gap" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {gaps.map(item => (
                  <div key={item.id} onClick={() => setSgPreview(item)} className="card"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid #8b6bc4', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(139,107,196,0.1)')} onMouseLeave={offHover()}>
                    <span style={{ fontSize: 22, marginTop: 2 }}>🎯</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{item.skill}</div>
                      {(item.current_level || item.target_level) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                          {item.current_level && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--mist)', fontWeight: 600, color: 'rgba(13,13,13,0.5)' }}>Now: {item.current_level}</span>}
                          {item.current_level && item.target_level && <span style={{ color: 'rgba(13,13,13,0.3)' }}>→</span>}
                          {item.target_level && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(139,107,196,0.1)', fontWeight: 700, color: '#8b6bc4', border: '1px solid rgba(139,107,196,0.2)' }}>Target: {item.target_level}</span>}
                        </div>
                      )}
                      {item.why_needed && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginTop: 6 }}>{item.why_needed.slice(0, 90)}{item.why_needed.length > 90 ? '…' : ''}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openSgEdit(item)} style={{ padding: 5 }}>✎</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleSgDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Feedback Received
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'feedback' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>💬 Feedback Received</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Positive and critical feedback from peers and managers — and what you did with it.</p></div>
              <button className="btn btn-primary" onClick={openFbCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Feedback</button>
            </div>

            {/* Type filter stats */}
            {!fbLoad && feedbacks.length > 0 && (() => {
              const counts = feedbacks.reduce((acc, f) => { acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1; return acc; }, {});
              return (
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {Object.entries(FB_CONFIG).map(([type, cfg]) => counts[type] ? (
                    <div key={type} style={{ padding: '8px 16px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}33`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Fraunces', color: cfg.color }}>{counts[type]}</span>
                    </div>
                  ) : null)}
                </div>
              );
            })()}

            {fbLoad ? <Skeletons h={110} /> : feedbacks.length === 0 ? (
              <Empty icon="💬" title="No feedback logged" desc="Great feedback is a gift. Capture it so you can act on it." onAdd={openFbCreate} label="+ Log First Feedback" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {feedbacks.map(item => {
                  const cfg = FB_CONFIG[item.feedback_type] || FB_CONFIG.positive;
                  return (
                    <div key={item.id} onClick={() => setFbPreview(item)} className="card"
                      style={{ borderLeft: `4px solid ${cfg.border}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={onHover(`${cfg.border}22`)} onMouseLeave={offHover()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <FeedbackBadge type={item.feedback_type} />
                          {item.from_person && <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(13,13,13,0.6)' }}>from {item.from_person}</span>}
                          <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)' }}>{dateLabel(item.date)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-sm btn-ghost" onClick={() => openFbEdit(item)} style={{ padding: 5 }}>✎</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => handleFbDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.content}</p>
                      {item.action_taken && <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>→ {item.action_taken.slice(0, 80)}{item.action_taken.length > 80 ? '…' : ''}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════ CREATE / EDIT MODALS ════════════ */}

      {/* Skills */}
      {skModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSkModal(false)}><div className="modal">
        <div className="modal-header"><h3>{skEdit ? 'Edit Skill' : 'Add Skill'}</h3><button className="modal-close" onClick={() => setSkModal(false)}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Skill name</label><input maxLength={200} className="form-input" value={skForm.name} onChange={e => setSkForm({ ...skForm, name: e.target.value })} placeholder="e.g. TypeScript, Public Speaking…" /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Category</label><input maxLength={200} className="form-input" value={skForm.category} onChange={e => setSkForm({ ...skForm, category: e.target.value })} placeholder="Technical / Soft / Creative…" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Level: {LEVEL_LABELS[skForm.level]}</label>
          <input maxLength={200} type="range" min="1" max="5" value={skForm.level} onChange={e => setSkForm({ ...skForm, level: +e.target.value })} style={{ width: '100%', accentColor: LEVEL_COLORS[skForm.level] }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(13,13,13,0.35)', marginTop: 4 }}>
            {LEVEL_LABELS.slice(1).map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Started (optional)</label><input maxLength={200} type="date" className="form-input" value={skForm.started_at} onChange={e => setSkForm({ ...skForm, started_at: e.target.value })} /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notes (optional)</label><textarea maxLength={2000} className="form-textarea" value={skForm.notes} onChange={e => setSkForm({ ...skForm, notes: e.target.value })} placeholder="Resources, milestones, context…" style={{ minHeight: 75 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setSkModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSkSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : skEdit ? 'Save Changes' : 'Add Skill'}</button></div>
      </div></div>)}

      {/* Failure Log */}
      {flModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setFlModal(false)}><div className="modal">
        <div className="modal-header"><h3>{flEdit ? 'Edit Entry' : 'Log a Failure'}</h3><button className="modal-close" onClick={() => setFlModal(false)}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={flForm.date} onChange={e => setFlForm({ ...flForm, date: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Domain</label><input maxLength={200} className="form-input" value={flForm.domain} onChange={e => setFlForm({ ...flForm, domain: e.target.value })} placeholder="Work / Health / Relationships…" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">What happened?</label><textarea maxLength={2000} className="form-textarea" value={flForm.what_happened} onChange={e => setFlForm({ ...flForm, what_happened: e.target.value })} placeholder="Be specific and honest…" style={{ minHeight: 90 }} /></div>
        <div className="form-group"><label className="form-label">What did you learn? (optional)</label><textarea maxLength={2000} className="form-textarea" value={flForm.lesson} onChange={e => setFlForm({ ...flForm, lesson: e.target.value })} placeholder="The real lesson, not just the surface one…" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setFlModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleFlSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : flEdit ? 'Save Changes' : 'Log Entry'}</button></div>
      </div></div>)}

      {/* Skills Gap */}
      {sgModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSgModal(false)}><div className="modal">
        <div className="modal-header"><h3>{sgEdit ? 'Edit Gap' : 'Add Skills Gap'}</h3><button className="modal-close" onClick={() => setSgModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Skill needed</label><input maxLength={200} className="form-input" value={sgForm.skill} onChange={e => setSgForm({ ...sgForm, skill: e.target.value })} placeholder="e.g. System Design, Negotiation…" /></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Current level</label><input maxLength={200} className="form-input" value={sgForm.current_level} onChange={e => setSgForm({ ...sgForm, current_level: e.target.value })} placeholder="Beginner / None / Basic…" /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Target level</label><input maxLength={200} className="form-input" value={sgForm.target_level} onChange={e => setSgForm({ ...sgForm, target_level: e.target.value })} placeholder="Intermediate / Expert…" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Why is this needed?</label><textarea maxLength={2000} className="form-textarea" value={sgForm.why_needed} onChange={e => setSgForm({ ...sgForm, why_needed: e.target.value })} placeholder="What role, project, or goal requires this skill?" style={{ minHeight: 80 }} /></div>
        <div className="form-group"><label className="form-label">Resources to close the gap (optional)</label><textarea maxLength={2000} className="form-textarea" value={sgForm.resources} onChange={e => setSgForm({ ...sgForm, resources: e.target.value })} placeholder="Courses, books, mentors, projects…" style={{ minHeight: 70 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setSgModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleSgSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : sgEdit ? 'Save Changes' : 'Add Gap'}</button></div>
      </div></div>)}

      {/* Feedback */}
      {fbModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setFbModal(false)}><div className="modal modal-md">
        <div className="modal-header"><h3>{fbEdit ? 'Edit Feedback' : 'Log Feedback'}</h3><button className="modal-close" onClick={() => setFbModal(false)}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={fbForm.date} onChange={e => setFbForm({ ...fbForm, date: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">From (optional)</label><input maxLength={200} className="form-input" value={fbForm.from_person} onChange={e => setFbForm({ ...fbForm, from_person: e.target.value })} placeholder="Manager / Peer / Client…" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Type</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {Object.entries(FB_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setFbForm({ ...fbForm, feedback_type: key })}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${fbForm.feedback_type === key ? cfg.border : 'rgba(13,13,13,0.1)'}`, background: fbForm.feedback_type === key ? cfg.bg : 'transparent', color: fbForm.feedback_type === key ? cfg.color : 'rgba(13,13,13,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group"><label className="form-label">Feedback content</label><textarea maxLength={2000} className="form-textarea" value={fbForm.content} onChange={e => setFbForm({ ...fbForm, content: e.target.value })} placeholder="What was the feedback, verbatim or paraphrased?" style={{ minHeight: 100 }} /></div>
        <div className="form-group"><label className="form-label">What did you do with it? (optional)</label><textarea maxLength={2000} className="form-textarea" value={fbForm.action_taken} onChange={e => setFbForm({ ...fbForm, action_taken: e.target.value })} placeholder="Did you act on it? How?" style={{ minHeight: 70 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setFbModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleFbSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : fbEdit ? 'Save Changes' : 'Log Feedback'}</button></div>
      </div></div>)}

      {/* ════════════ PREVIEW MODALS ════════════ */}

      <PreviewModal item={skPreview} onClose={() => setSkPreview(null)} icon="📈" iconBg={`${LEVEL_COLORS[skPreview?.level] || 'var(--sage)'}18`} titleColor={LEVEL_COLORS[skPreview?.level] || 'var(--sage)'} title={skPreview?.name} subtitle={skPreview?.category} body={skPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <LevelDots level={skPreview.level || 1} size={14} />
        {skPreview.started_at && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>🌱 Started {skPreview.started_at}</div>}
        {skPreview.notes && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={skPreview.notes} /></div>}
      </div>)} />

      <PreviewModal item={flPreview} onClose={() => setFlPreview(null)} icon="💥" iconBg="rgba(201,168,76,0.1)" titleColor="#c9a84c" title={flPreview?.what_happened} subtitle={`${flPreview?.date ? dateLabel(flPreview.date) : '—'}${flPreview?.domain ? ' · ' + flPreview.domain : ''}`} body={flPreview?.lesson && (<div style={{ padding: '16px 20px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--sage)', marginBottom: 10 }}>Lesson extracted</div>
        <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={flPreview.lesson} /></div>
      </div>)} />

      <PreviewModal item={sgPreview} onClose={() => setSgPreview(null)} icon="🎯" iconBg="rgba(139,107,196,0.1)" titleColor="#8b6bc4" title={sgPreview?.skill} subtitle={[sgPreview?.current_level && `Now: ${sgPreview.current_level}`, sgPreview?.target_level && `Target: ${sgPreview.target_level}`].filter(Boolean).join(' → ')} body={sgPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sgPreview.why_needed && <div style={{ padding: '14px 18px', background: 'rgba(139,107,196,0.07)', borderRadius: 12, borderLeft: '4px solid #8b6bc4' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: '#8b6bc4', marginBottom: 8 }}>Why needed</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{sgPreview.why_needed}</p></div>}
        {sgPreview.resources && <div style={{ padding: '14px 18px', background: 'rgba(91,139,168,0.06)', borderRadius: 12, borderLeft: '4px solid #5b8ba8' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: '#5b8ba8', marginBottom: 8 }}>Resources</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={sgPreview.resources} /></div></div>}
      </div>)} />

      <PreviewModal item={fbPreview} onClose={() => setFbPreview(null)} icon="💬" iconBg={`${(FB_CONFIG[fbPreview?.feedback_type] || FB_CONFIG.positive).border}18`} titleColor={(FB_CONFIG[fbPreview?.feedback_type] || FB_CONFIG.positive).color} title={`From ${fbPreview?.from_person || 'Peer'}`} subtitle={fbPreview ? dateLabel(fbPreview.date) : ''} body={fbPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FeedbackBadge type={fbPreview.feedback_type} />
        <div style={{ padding: '16px 20px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, fontStyle: 'italic' }}>"{fbPreview.content}"</p></div>
        {fbPreview.action_taken && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--sage)', marginBottom: 8 }}>Action taken</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{fbPreview.action_taken}</p></div>}
      </div>)} />

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
