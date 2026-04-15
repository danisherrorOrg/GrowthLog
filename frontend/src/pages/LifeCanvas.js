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
    label: '🎨 Creativity',
    tabs: [
      { id: 'project-ideas',   label: 'Project Ideas',     icon: '💡', color: '#c9a84c' },
      { id: 'creative-sessions', label: 'Creative Time',   icon: '🎨', color: '#8b6bc4' },
    ],
  },
  {
    label: '✨ Spirituality',
    tabs: [
      { id: 'meaning-log',     label: 'Meaning Log',       icon: '✨', color: '#5b8ba8' },
    ],
  },
  {
    label: '🏖️ Fun & Play',
    tabs: [
      { id: 'travel-log',      label: 'Travel Log',        icon: '✈️', color: 'var(--sage)' },
      { id: 'bucket-list',     label: 'Bucket List',       icon: '🪣', color: '#c4623a' },
    ],
  },
];

const ALL_TABS = SECTIONS.flatMap(s => s.tabs);
const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────
const dateLabel = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };
const onHover   = (c) => (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c}`; };
const offHover  = () => (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; };
const Skeletons = ({ n = 3, h = 90 }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }} />)}</div>);
const Empty = ({ icon, title, desc, onAdd, label }) => (<div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button className="btn btn-primary" onClick={onAdd} style={{ borderRadius: 30 }}>{label}</button></div>);

// ── Status badges ─────────────────────────────────────────────────────────────
const IDEA_STATUS = {
  backlog:     { label: 'Backlog',     bg: 'rgba(13,13,13,0.06)', color: 'rgba(13,13,13,0.45)' },
  in_progress: { label: 'In Progress', bg: 'rgba(201,168,76,0.12)', color: '#c9a84c' },
  done:        { label: 'Done',        bg: 'rgba(107,140,107,0.12)', color: 'var(--sage)' },
};
const BUCKET_STATUS = {
  not_started: { label: 'Not Started', bg: 'rgba(13,13,13,0.06)', color: 'rgba(13,13,13,0.45)' },
  in_progress: { label: 'In Progress', bg: 'rgba(196,98,58,0.1)', color: '#c4623a' },
  done:        { label: 'Achieved',    bg: 'rgba(107,140,107,0.12)', color: 'var(--sage)' },
};
function StatusBadge({ type, status }) {
  const config = (type === 'idea' ? IDEA_STATUS[status] : BUCKET_STATUS[status]) || IDEA_STATUS.backlog;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: config.bg, color: config.color }}>{config.label}</span>;
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

export default function LifeCanvas() {
  const [activeTab, setActiveTab] = useState('project-ideas');

  // ── Project Ideas ──────────────────────────────────────────────────────────
  const [ideas, setIdeas]           = useState([]); const [idLoad, setIdLoad] = useState(true);
  const [idModal, setIdModal]       = useState(false); const [idEdit, setIdEdit] = useState(null);
  const [idForm, setIdForm]         = useState({ title: '', description: '', status: 'backlog', link: '' });
  const [idPreview, setIdPreview]   = useState(null);

  // ── Creative Sessions ──────────────────────────────────────────────────────
  const [creatives, setCreatives]   = useState([]); const [crLoad, setCrLoad] = useState(true);
  const [crModal, setCrModal]       = useState(false); const [crEdit, setCrEdit] = useState(null);
  const [crForm, setCrForm]         = useState({ date: TODAY, project_name: '', hours: '', output_notes: '' });
  const [crPreview, setCrPreview]   = useState(null);

  // ── Meaning Log ────────────────────────────────────────────────────────────
  const [meanings, setMeanings]     = useState([]); const [mnLoad, setMnLoad] = useState(true);
  const [mnModal, setMnModal]       = useState(false); const [mnEdit, setMnEdit] = useState(null);
  const [mnForm, setMnForm]         = useState({ date: TODAY, experience: '', why_meaningful: '' });
  const [mnPreview, setMnPreview]   = useState(null);

  // ── Travel Log ─────────────────────────────────────────────────────────────
  const [travels, setTravels]       = useState([]); const [trLoad, setTrLoad] = useState(true);
  const [trModal, setTrModal]       = useState(false); const [trEdit, setTrEdit] = useState(null);
  const [trForm, setTrForm]         = useState({ date: TODAY, destination: '', memories: '', photos_link: '' });
  const [trPreview, setTrPreview]   = useState(null);

  // ── Bucket List ────────────────────────────────────────────────────────────
  const [buckets, setBuckets]       = useState([]); const [blLoad, setBlLoad] = useState(true);
  const [blModal, setBlModal]       = useState(false); const [blEdit, setBlEdit] = useState(null);
  const [blForm, setBlForm]         = useState({ title: '', description: '', status: 'not_started', target_date: '', completed_date: '' });
  const [blPreview, setBlPreview]   = useState(null);

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
    load('/passions/project-ideas',     setIdeas,     setIdLoad);
    load('/passions/creative-sessions', setCreatives, setCrLoad);
    load('/passions/meaning-log',       setMeanings,  setMnLoad);
    load('/passions/travel-log',        setTravels,   setTrLoad);
    load('/passions/bucket-list',       setBuckets,   setBlLoad);
  }, []);

  const reloadId = () => load('/passions/project-ideas',     setIdeas,     setIdLoad);
  const reloadCr = () => load('/passions/creative-sessions', setCreatives, setCrLoad);
  const reloadMn = () => load('/passions/meaning-log',       setMeanings,  setMnLoad);
  const reloadTr = () => load('/passions/travel-log',        setTravels,   setTrLoad);
  const reloadBl = () => load('/passions/bucket-list',       setBuckets,   setBlLoad);

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

  // ── Project Ideas CRUD ─────────────────────────────────────────────────────
  const openIdCreate = () => { setIdEdit(null); setIdForm({ title: '', description: '', status: 'backlog', link: '' }); setIdModal(true); };
  const openIdEdit   = (i) => { setIdEdit(i); setIdForm({ title: i.title, description: i.description||'', status: i.status||'backlog', link: i.link||'' }); setIdModal(true); };
  const handleIdSave = () => {
    if (!idForm.title.trim()) return toast.error('Name the idea');
    crudSave({ editItem: idEdit, postUrl: '/passions/project-ideas', putUrl: id => `/passions/project-ideas/${id}`, form: idForm,
      onSuccess: () => { toast.success(idEdit ? 'Updated' : '💡 Idea added'); setIdModal(false); reloadId(); }
    });
  };
  const handleIdDel = crudDel('/passions/project-ideas', reloadId);

  // ── Creative Sessions CRUD ─────────────────────────────────────────────────
  const openCrCreate = () => { setCrEdit(null); setCrForm({ date: TODAY, project_name: '', hours: '', output_notes: '' }); setCrModal(true); };
  const openCrEdit   = (i) => { setCrEdit(i); setCrForm({ date: i.date||TODAY, project_name: i.project_name, hours: i.hours||'', output_notes: i.output_notes||'' }); setCrModal(true); };
  const handleCrSave = () => {
    if (!crForm.project_name.trim() || !crForm.hours) return toast.error('Fill in project and hours');
    crudSave({ editItem: crEdit, postUrl: '/passions/creative-sessions', putUrl: id => `/passions/creative-sessions/${id}`, form: { ...crForm, hours: +crForm.hours },
      onSuccess: () => { toast.success(crEdit ? 'Updated' : '🎨 Session logged'); setCrModal(false); reloadCr(); }
    });
  };
  const handleCrDel = crudDel('/passions/creative-sessions', reloadCr);

  // ── Meaning Log CRUD ───────────────────────────────────────────────────────
  const openMnCreate = () => { setMnEdit(null); setMnForm({ date: TODAY, experience: '', why_meaningful: '' }); setMnModal(true); };
  const openMnEdit   = (i) => { setMnEdit(i); setMnForm({ date: i.date||TODAY, experience: i.experience, why_meaningful: i.why_meaningful||'' }); setMnModal(true); };
  const handleMnSave = () => {
    if (!mnForm.experience.trim()) return toast.error('Describe the experience');
    crudSave({ editItem: mnEdit, postUrl: '/passions/meaning-log', putUrl: id => `/passions/meaning-log/${id}`, form: mnForm,
      onSuccess: () => { toast.success(mnEdit ? 'Updated' : '✨ Meaningful moment saved'); setMnModal(false); reloadMn(); }
    });
  };
  const handleMnDel = crudDel('/passions/meaning-log', reloadMn);

  // ── Travel Log CRUD ────────────────────────────────────────────────────────
  const openTrCreate = () => { setTrEdit(null); setTrForm({ date: TODAY, destination: '', memories: '', photos_link: '' }); setTrModal(true); };
  const openTrEdit   = (i) => { setTrEdit(i); setTrForm({ date: i.date||TODAY, destination: i.destination, memories: i.memories||'', photos_link: i.photos_link||'' }); setTrModal(true); };
  const handleTrSave = () => {
    if (!trForm.destination.trim()) return toast.error('Where did you go?');
    crudSave({ editItem: trEdit, postUrl: '/passions/travel-log', putUrl: id => `/passions/travel-log/${id}`, form: trForm,
      onSuccess: () => { toast.success(trEdit ? 'Updated' : '✈️ Trip logged'); setTrModal(false); reloadTr(); }
    });
  };
  const handleTrDel = crudDel('/passions/travel-log', reloadTr);

  // ── Bucket List CRUD ───────────────────────────────────────────────────────
  const openBlCreate = () => { setBlEdit(null); setBlForm({ title: '', description: '', status: 'not_started', target_date: '', completed_date: '' }); setBlModal(true); };
  const openBlEdit   = (i) => { setBlEdit(i); setBlForm({ title: i.title, description: i.description||'', status: i.status||'not_started', target_date: i.target_date||'', completed_date: i.completed_date||'' }); setBlModal(true); };
  const handleBlSave = () => {
    if (!blForm.title.trim()) return toast.error('Name the item');
    crudSave({ editItem: blEdit, postUrl: '/passions/bucket-list', putUrl: id => `/passions/bucket-list/${id}`, form: blForm,
      onSuccess: () => { toast.success(blEdit ? 'Updated' : '🪣 Goal added'); setBlModal(false); reloadBl(); }
    });
  };
  const handleBlDel = crudDel('/passions/bucket-list', reloadBl);

  return (
    <div>
      <div className="page-header">
        <h2>Life Canvas 🎨</h2>
        <p>Explore your creative side, capture the magic in your travels, and design the life you've always wanted to live.</p>
      </div>

      <div className="page-body">
        {/* ── Grouped tab nav ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
          {SECTIONS.map(section => (
            <div key={section.label}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'rgba(13,13,13,0.3)', marginBottom: 8 }}>{section.label}</div>
              <div className="wrap-on-mobile" style={{ display: 'flex', gap: 5, background: 'var(--mist)', padding: 4, borderRadius: 12 }}>
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
            TAB: Project Ideas
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'project-ideas' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>💡 Project Ideas</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Backlog of things you want to make, build, or explore.</p></div>
              <button className="btn btn-primary" onClick={openIdCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ New Idea</button>
            </div>

            {idLoad ? <Skeletons /> : ideas.length === 0 ? (
              <Empty icon="💡" title="Idea backlog empty" desc="Every great project starts as a fleeting thought. Capture them here." onAdd={openIdCreate} label="+ Add Idea" />
            ) : (
              <div className="auto-grid" style={{ gap: 16 }}>
                {ideas.map(item => (
                  <div key={item.id} onClick={() => setIdPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #c9a84c', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(201,168,76,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{item.title}</div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openIdEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleIdDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.description && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <StatusBadge type="idea" status={item.status} />
                      {item.link && <span style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600 }}>🔗 Link</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Creative Sessions
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'creative-sessions' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🎨 Creative Time</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Time spent on creative work and what you achieved.</p></div>
              <button className="btn btn-primary" onClick={openCrCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Session</button>
            </div>

            {crLoad ? <Skeletons /> : creatives.length === 0 ? (
              <Empty icon="🎨" title="No creative sessions" desc="What gets measured gets managed. Log your flow states." onAdd={openCrCreate} label="+ Log Session" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {creatives.map(item => (
                  <div key={item.id} onClick={() => setCrPreview(item)} className="card"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid #8b6bc4', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(139,107,196,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{item.project_name}</span>
                        <span style={{ fontSize: 13, color: '#8b6bc4', fontWeight: 700 }}>⏱ {item.hours}h</span>
                        <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', fontWeight: 600 }}>{dateLabel(item.date)}</span>
                      </div>
                      {item.output_notes && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.output_notes}</div>}
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
            TAB: Meaning & Purpose Log
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'meaning-log' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>✨ Meaning Log</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Moments that felt deeply meaningful, purposeful, or connected.</p></div>
              <button className="btn btn-primary" onClick={openMnCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Moment</button>
            </div>

            {mnLoad ? <Skeletons h={110} /> : meanings.length === 0 ? (
              <Empty icon="✨" title="No meaningful moments logged" desc="Capture the small things that make life feel rich and purposeful." onAdd={openMnCreate} label="+ Log First Moment" />
            ) : (
              <div className="auto-grid" style={{ gap: 16 }}>
                {meanings.map(item => (
                  <div key={item.id} onClick={() => setMnPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #5b8ba8', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(91,139,168,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#5b8ba8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>{dateLabel(item.date)}</div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openMnEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleMnDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.experience}</div>
                    {item.why_meaningful && <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>💡 {item.why_meaningful.slice(0, 80)}{item.why_meaningful.length > 80 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Travel Log
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'travel-log' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>✈️ Travel Log</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Places visited, core memories, and photo archives.</p></div>
              <button className="btn btn-primary" onClick={openTrCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Trip</button>
            </div>

            {trLoad ? <Skeletons /> : travels.length === 0 ? (
              <Empty icon="✈️" title="No trips logged" desc="Keep a record of your adventures and the memories you made." onAdd={openTrCreate} label="+ Add Trip" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {travels.map(item => (
                  <div key={item.id} onClick={() => setTrPreview(item)} className="card"
                    style={{ borderLeft: '4px solid var(--sage)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(107,140,107,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>📍</span>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{item.destination}</span>
                        <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontWeight: 600 }}>{dateLabel(item.date)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openTrEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleTrDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.memories && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', paddingLeft: 30, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.memories}</div>}
                    {item.photos_link && <div style={{ fontSize: 12, paddingLeft: 30, color: 'var(--sage)', fontWeight: 700, marginTop: 8 }}>📸 Has Photos Link</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Bucket List
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'bucket-list' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🪣 Bucket List</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Experiences and dreams to pursue in this lifetime.</p></div>
              <button className="btn btn-primary" onClick={openBlCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Goal</button>
            </div>

            {blLoad ? <Skeletons /> : buckets.length === 0 ? (
              <Empty icon="🪣" title="Bucket list is empty" desc="What are the big things you want to do before you die?" onAdd={openBlCreate} label="+ Add First Item" />
            ) : (
              <div className="auto-grid" style={{ gap: 16 }}>
                {buckets.map(item => (
                  <div key={item.id} onClick={() => setBlPreview(item)} className="card"
                    style={{ borderLeft: `4px solid ${item.status === 'done' ? 'var(--sage)' : '#c4623a'}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', opacity: item.status === 'done' ? 0.75 : 1 }}
                    onMouseEnter={onHover('rgba(196,98,58,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>{item.title}</div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openBlEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleBlDel(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.description && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <StatusBadge type="bucket" status={item.status} />
                      <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', fontWeight: 600 }}>
                        {item.status === 'done' ? `Achieved ${item.completed_date || '?'}` : (item.target_date ? `Target: ${item.target_date}` : '')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════ CREATE / EDIT MODALS ════════════ */}

      {/* Project Ideas */}
      {idModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIdModal(false)}><div className="modal">
        <div className="modal-header"><h3>{idEdit ? 'Edit Idea' : 'Add Project Idea'}</h3><button className="modal-close" onClick={() => setIdModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Title</label><input maxLength={200} className="form-input" value={idForm.title} onChange={e => setIdForm({ ...idForm, title: e.target.value })} placeholder="e.g. Build an automatic plant waterer" /></div>
        <div className="form-group"><label className="form-label">Description (optional)</label><textarea maxLength={2000} className="form-textarea" value={idForm.description} onChange={e => setIdForm({ ...idForm, description: e.target.value })} placeholder="What involves? Tech stack? Tools?" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Status</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {Object.entries(IDEA_STATUS).map(([key, cfg]) => (
              <button key={key} onClick={() => setIdForm({ ...idForm, status: key })}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${idForm.status === key ? cfg.color : 'rgba(13,13,13,0.1)'}`, background: idForm.status === key ? cfg.bg : 'transparent', color: idForm.status === key ? cfg.color : 'rgba(13,13,13,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Link (optional)</label><input maxLength={200} className="form-input" value={idForm.link} onChange={e => setIdForm({ ...idForm, link: e.target.value })} placeholder="Repo, Pinterest board, etc." /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setIdModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleIdSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : idEdit ? 'Save Changes' : 'Add Idea'}</button></div>
      </div></div>)}

      {/* Creative Sessions */}
      {crModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCrModal(false)}><div className="modal">
        <div className="modal-header"><h3>{crEdit ? 'Edit Session' : 'Log Creative Session'}</h3><button className="modal-close" onClick={() => setCrModal(false)}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={crForm.date} onChange={e => setCrForm({ ...crForm, date: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Hours spent</label><input maxLength={200} type="number" className="form-input" value={crForm.hours} onChange={e => setCrForm({ ...crForm, hours: e.target.value })} min="0.1" step="0.25" placeholder="e.g. 2" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Project / Focus</label><input maxLength={200} className="form-input" value={crForm.project_name} onChange={e => setCrForm({ ...crForm, project_name: e.target.value })} placeholder="e.g. Painting, Coding, Writing…" /></div>
        <div className="form-group"><label className="form-label">Output & Notes (optional)</label><textarea maxLength={2000} className="form-textarea" value={crForm.output_notes} onChange={e => setCrForm({ ...crForm, output_notes: e.target.value })} placeholder="What did you make or learn?" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setCrModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleCrSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : crEdit ? 'Save Changes' : 'Log Session'}</button></div>
      </div></div>)}

      {/* Meaning Log */}
      {mnModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMnModal(false)}><div className="modal">
        <div className="modal-header"><h3>{mnEdit ? 'Edit Event' : 'Log Meaningful Moment'}</h3><button className="modal-close" onClick={() => setMnModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={mnForm.date} onChange={e => setMnForm({ ...mnForm, date: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">The Experience</label><textarea maxLength={2000} className="form-textarea" value={mnForm.experience} onChange={e => setMnForm({ ...mnForm, experience: e.target.value })} placeholder="What happened that felt so deep?" style={{ minHeight: 90 }} /></div>
        <div className="form-group"><label className="form-label">Why was it meaningful? (optional)</label><textarea maxLength={2000} className="form-textarea" value={mnForm.why_meaningful} onChange={e => setMnForm({ ...mnForm, why_meaningful: e.target.value })} placeholder="What struck you about it?" style={{ minHeight: 80 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setMnModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleMnSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : mnEdit ? 'Save Changes' : 'Log Moment'}</button></div>
      </div></div>)}

      {/* Travel Log */}
      {trModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTrModal(false)}><div className="modal">
        <div className="modal-header"><h3>{trEdit ? 'Edit Trip' : 'Log Travel'}</h3><button className="modal-close" onClick={() => setTrModal(false)}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={trForm.date} onChange={e => setTrForm({ ...trForm, date: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Destination</label><input maxLength={200} className="form-input" value={trForm.destination} onChange={e => setTrForm({ ...trForm, destination: e.target.value })} placeholder="Tokyo, Paris…" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Core Memories (optional)</label><textarea maxLength={2000} className="form-textarea" value={trForm.memories} onChange={e => setTrForm({ ...trForm, memories: e.target.value })} placeholder="Highlight moments, food, people…" style={{ minHeight: 100 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Photos Link (optional)</label><input maxLength={200} className="form-input" value={trForm.photos_link} onChange={e => setTrForm({ ...trForm, photos_link: e.target.value })} placeholder="Google Photos URL, etc." /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setTrModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleTrSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : trEdit ? 'Save Changes' : 'Log Travel'}</button></div>
      </div></div>)}

      {/* Bucket List */}
      {blModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBlModal(false)}><div className="modal modal-lg">
        <div className="modal-header"><h3>{blEdit ? 'Edit Goal' : 'Add to Bucket List'}</h3><button className="modal-close" onClick={() => setBlModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Goal / Dream</label><input maxLength={200} className="form-input" value={blForm.title} onChange={e => setBlForm({ ...blForm, title: e.target.value })} placeholder="e.g. See the Northern Lights" /></div>
        <div className="form-group"><label className="form-label">Why? / Details (optional)</label><textarea maxLength={2000} className="form-textarea" value={blForm.description} onChange={e => setBlForm({ ...blForm, description: e.target.value })} placeholder="What's the motivation? Who with?" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="form-group"><label className="form-label">Status</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {Object.entries(BUCKET_STATUS).map(([key, cfg]) => (
              <button key={key} onClick={() => setBlForm({ ...blForm, status: key })}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${blForm.status === key ? cfg.color : 'rgba(13,13,13,0.1)'}`, background: blForm.status === key ? cfg.bg : 'transparent', color: blForm.status === key ? cfg.color : 'rgba(13,13,13,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Target Date (optional)</label><input maxLength={200} type="date" className="form-input" value={blForm.target_date} onChange={e => setBlForm({ ...blForm, target_date: e.target.value })} /></div>
          {blForm.status === 'done' && <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Completed On</label><input maxLength={200} type="date" className="form-input" value={blForm.completed_date} onChange={e => setBlForm({ ...blForm, completed_date: e.target.value })} /></div>}
        </div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" onClick={() => setBlModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleBlSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : blEdit ? 'Save Changes' : 'Add to List'}</button></div>
      </div></div>)}

      {/* ════════════ PREVIEW MODALS ════════════ */}

      <PreviewModal item={idPreview} onClose={() => setIdPreview(null)} icon="💡" iconBg="rgba(201,168,76,0.1)" titleColor="#c9a84c" title={idPreview?.title} subtitle={idPreview ? `Added ${dateLabel(idPreview.created_at)}` : ''} body={idPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StatusBadge type="idea" status={idPreview.status} />
          {idPreview.link && <a href={idPreview.link} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#c9a84c', fontWeight: 700, textDecoration: 'none' }}>🔗 View Link Document ↗</a>}
        </div>
        {idPreview.description && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0, padding: '16px 20px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><MarkdownRenderer content={idPreview.description} /></div>}
      </div>)} />

      <PreviewModal item={crPreview} onClose={() => setCrPreview(null)} icon="🎨" iconBg="rgba(139,107,196,0.1)" titleColor="#8b6bc4" title={crPreview?.project_name} subtitle={crPreview ? `${dateLabel(crPreview.date)} — ⏱ ${crPreview.hours}h invested` : ''} body={crPreview?.output_notes && (<div style={{ padding: '16px 20px', background: 'rgba(139,107,196,0.05)', borderRadius: 12, borderLeft: '4px solid #8b6bc4' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: '#8b6bc4', marginBottom: 10 }}>Session output</div>
        <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={crPreview.output_notes} /></div>
      </div>)} />

      <PreviewModal item={mnPreview} onClose={() => setMnPreview(null)} icon="✨" iconBg="rgba(91,139,168,0.1)" titleColor="#5b8ba8" title="Meaningful Moment" subtitle={mnPreview ? dateLabel(mnPreview.date) : ''} body={mnPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '16px 20px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 500 }}>{mnPreview.experience}</p></div>
        {mnPreview.why_meaningful && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--sage)', marginBottom: 8 }}>Why it felt meaningful</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{mnPreview.why_meaningful}</p></div>}
      </div>)} />

      <PreviewModal item={trPreview} onClose={() => setTrPreview(null)} icon="✈️" iconBg="rgba(107,140,107,0.1)" titleColor="var(--sage)" title={trPreview?.destination} subtitle={trPreview ? dateLabel(trPreview.date) : ''} body={trPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {trPreview.memories && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--sage)', marginBottom: 8 }}>Memories & Notes</div><MarkdownRenderer content={trPreview.memories} /></div>}
        {trPreview.photos_link && <a href={trPreview.photos_link} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '10px 16px', background: 'rgba(107,140,107,0.1)', color: 'var(--sage)', borderRadius: 8, fontWeight: 700, textDecoration: 'none', alignSelf: 'flex-start', marginTop: 10 }}>📸 View Photos Gallery ↗</a>}
      </div>)} />

      <PreviewModal item={blPreview} onClose={() => setBlPreview(null)} icon="🪣" iconBg="rgba(196,98,58,0.1)" titleColor="#c4623a" title={blPreview?.title} subtitle="" body={blPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <StatusBadge type="bucket" status={blPreview.status} />
          {blPreview.target_date && <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', fontWeight: 600 }}>Target: {blPreview.target_date}</span>}
          {blPreview.status === 'done' && <span style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 700 }}>Achieved: {blPreview.completed_date || blPreview.target_date} 🎉</span>}
        </div>
        {blPreview.description && <div className="markdown-body" style={{ padding: '16px 20px', background: 'rgba(13,13,13,0.03)', borderRadius: 12, fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={blPreview.description} /></div>}
      </div>)} />

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
