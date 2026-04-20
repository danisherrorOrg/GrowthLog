import { useEffect, useState, useMemo } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

const TABS = [
  { id: 'anti-goals',    label: 'Anti-Goals',      icon: '🚫', color: 'var(--rust)' },
  { id: 'graveyard',    label: 'Habit Graveyard',  icon: '🪦', color: '#8b6bc4' },
  { id: 'time',         label: 'Time Tracking',    icon: '⏱', color: 'var(--sage)' },
  { id: 'screen',       label: 'Screen Time',      icon: '📱', color: '#5b8ba8' },
  { id: 'procrastination', label: 'Procrastination', icon: '😬', color: '#c9a84c' },
  { id: 'nottodo',      label: 'Not-to-do',        icon: '🚷', color: '#c4623a' },
  { id: 'triggers',     label: 'Trigger Journal',  icon: '🎯', color: '#e05a77' },
  { id: 'decisions',    label: 'Bad Decisions',    icon: '💀', color: '#7a5c8a' },
  { id: 'weaknesses',   label: 'Weakness Map',     icon: '🧩', color: '#b87333' },
];

const TODAY = new Date().toISOString().slice(0, 10);

// ── palette for categories ──────────────────────────────────────────────────
const PALETTE = ['#6b8c6b', '#5b8ba8', '#c9a84c', '#8b6bc4', '#c4623a', '#5b9e8f', '#c46b8b', '#7a8fa6', '#a89b6b'];
const catColor = (name, pool) => {
  if (!pool[name]) pool[name] = PALETTE[Object.keys(pool).length % PALETTE.length];
  return pool[name];
};

const onHover = (color) => (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}`; };
const offHover = () => (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; };
const Skeletons = ({ n = 3, h = 80 }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }} />)}</div>);
const Empty = ({ icon, title, desc, onAdd, label }) => (<div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button className="btn btn-primary" onClick={onAdd} style={{ borderRadius: 30 }}>{label}</button></div>);

const dateLabel = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };
const dayLabel = (d) => { try { return format(parseISO(d), 'EEEE, MMM d'); } catch { return d || '—'; } };

// ── 24h breakdown bar ────────────────────────────────────────────────────────
function HoursBar({ entries, colorMap, keyField = 'category' }) {
  const total = entries.reduce((s, e) => s + +e.hours, 0);
  const pct = Math.min(total / 24, 1);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'rgba(13,13,13,0.5)' }}>
        <span>{total.toFixed(1)}h logged</span>
        <span style={{ color: total > 20 ? 'var(--rust)' : 'rgba(13,13,13,0.4)' }}>{(24 - total).toFixed(1)}h untracked</span>
      </div>
      {/* segmented bar */}
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(13,13,13,0.06)', overflow: 'hidden', display: 'flex' }}>
        {entries.map((e, i) => (
          <div key={i} title={`${e[keyField]}: ${e.hours}h`} style={{ width: `${(+e.hours / 24) * 100}%`, background: catColor(e[keyField], colorMap), transition: 'width 0.4s' }} />
        ))}
      </div>
      {/* legend chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {entries.map((e, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: catColor(e[keyField], colorMap) + '22', color: catColor(e[keyField], colorMap), fontWeight: 700, border: `1px solid ${catColor(e[keyField], colorMap)}44` }}>
            {e[keyField]} · {e.hours}h
          </span>
        ))}
      </div>
    </div>
  );
}

// ── multi-row entry editor ───────────────────────────────────────────────────
function MultiRowEditor({ rows, setRows, keyLabel, keyPlaceholder, color }) {
  const total = rows.reduce((s, r) => s + (+r.hours || 0), 0);
  const over = total > 24;
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} className="multi-row-editor-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 18, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
            <input maxLength={200} className="form-input cat-input" style={{ flex: 1, minWidth: 0 }} value={row[keyLabel]}
              onChange={e => { const r = [...rows]; r[i] = { ...r[i], [keyLabel]: e.target.value }; setRows(r); }}
              placeholder={keyPlaceholder} />
            <input maxLength={200} className="form-input hours-input" type="number" style={{ width: 90, flexShrink: 0 }} value={row.hours}
              onChange={e => { const r = [...rows]; r[i] = { ...r[i], hours: e.target.value }; setRows(r); }}
              placeholder="hrs" min="0.1" step="0.25" />
            {rows.length > 1 && (
              <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(13,13,13,0.25)', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => setRows([...rows, { [keyLabel]: '', hours: '' }])}
        style={{ marginTop: 10, color, fontSize: 13 }}>+ Add row</button>
      {/* running total */}
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: over ? 'rgba(196,98,58,0.07)' : 'rgba(13,13,13,0.03)', border: `1px solid ${over ? 'rgba(196,98,58,0.2)' : 'rgba(13,13,13,0.06)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(13,13,13,0.5)' }}>Total this day</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: over ? 'var(--rust)' : color }}>{total.toFixed(1)}h / 24h {over && '⚠️'}</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const [activeTab, setActiveTab] = useState('anti-goals');

  // ── Anti-Goals ─────────────────────────────────────────────────────────
  const [antiGoals, setAntiGoals] = useState([]); const [agLoad, setAgLoad] = useState(true);
  const [agModal, setAgModal] = useState(false); const [agEdit, setAgEdit] = useState(null);
  const [agForm, setAgForm] = useState({ text: '', reason: '' });
  const [agPreview, setAgPreview] = useState(null);

  // ── Habit Graveyard ────────────────────────────────────────────────────
  const [habits, setHabits] = useState([]); const [hgLoad, setHgLoad] = useState(true);
  const [hgModal, setHgModal] = useState(false); const [hgEdit, setHgEdit] = useState(null);
  const [hgForm, setHgForm] = useState({ habit: '', reason: '', started_at: '', abandoned_at: '' });
  const [hgPreview, setHgPreview] = useState(null);

  // ── Time Tracking (DAY-CENTRIC) ────────────────────────────────────────
  const [timeEntries, setTimeEntries] = useState([]); const [teLoad, setTeLoad] = useState(true);
  const [teModal, setTeModal] = useState(false);
  const [teDate, setTeDate] = useState(TODAY);
  const [teRows, setTeRows] = useState([{ category: '', hours: '' }]);
  const [teEditEntry, setTeEditEntry] = useState(null); // single-entry edit
  const [teEditForm, setTeEditForm] = useState({ category: '', hours: '', notes: '' });
  const [teColorMap, setTeColorMap] = useState({});

  // ── Screen Time (DAY-CENTRIC) ──────────────────────────────────────────
  const [screenEntries, setScreenEntries] = useState([]); const [stLoad, setStLoad] = useState(true);
  const [stModal, setStModal] = useState(false);
  const [stDate, setStDate] = useState(TODAY);
  const [stRows, setStRows] = useState([{ app_category: '', hours: '' }]);
  const [stEditEntry, setStEditEntry] = useState(null);
  const [stEditForm, setStEditForm] = useState({ app_category: '', hours: '', notes: '' });
  const [stColorMap, setStColorMap] = useState({});

  // ── Procrastination ────────────────────────────────────────────────────
  const [procEntries, setProcEntries] = useState([]); const [prLoad, setPrLoad] = useState(true);
  const [prModal, setPrModal] = useState(false); const [prEdit, setPrEdit] = useState(null);
  const [prForm, setPrForm] = useState({ date: TODAY, what: '', why: '', outcome: '' });
  const [prPreview, setPrPreview] = useState(null);

  // ── Not-to-do ──────────────────────────────────────────────────────────
  const [notToDos, setNotToDos] = useState([]); const [ntLoad, setNtLoad] = useState(true);
  const [ntModal, setNtModal] = useState(false); const [ntEdit, setNtEdit] = useState(null);
  const [ntForm, setNtForm] = useState({ text: '', reason: '' });
  const [ntPreview, setNtPreview] = useState(null);

  // ── Trigger Journal ────────────────────────────────────────────────────
  const [triggers, setTriggers] = useState([]); const [trLoad, setTrLoad] = useState(true);
  const [trModal, setTrModal] = useState(false); const [trEdit, setTrEdit] = useState(null);
  const [trForm, setTrForm] = useState({ trigger: '', behavior: '', consequence: '', guard: '', date: TODAY });
  const [trPreview, setTrPreview] = useState(null);

  // ── Bad Decisions ──────────────────────────────────────────────────────
  const [decisions, setDecisions] = useState([]); const [dcLoad, setDcLoad] = useState(true);
  const [dcModal, setDcModal] = useState(false); const [dcEdit, setDcEdit] = useState(null);
  const [dcForm, setDcForm] = useState({ decision: '', what_went_wrong: '', root_cause: '', do_differently: '', domain: 'General', date: TODAY });
  const [dcPreview, setDcPreview] = useState(null);

  // ── Weakness Map ───────────────────────────────────────────────────────
  const [weaknesses, setWeaknesses] = useState([]); const [wkLoad, setWkLoad] = useState(true);
  const [wkModal, setWkModal] = useState(false); const [wkEdit, setWkEdit] = useState(null);
  const [wkForm, setWkForm] = useState({ weakness: '', description: '', severity: 3, frequency: 3, guard_system: '' });
  const [wkPreview, setWkPreview] = useState(null);

  // ── Shared ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);


  // ── Loaders ────────────────────────────────────────────────────────────
  const load = async (url, setter, setLoading) => {
    setLoading(true);
    try { const r = await API.get(url); setter(r.data); }
    catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load('/insights/anti-goals', setAntiGoals, setAgLoad);
    load('/insights/habit-graveyard', setHabits, setHgLoad);
    load('/insights/time-entries', setTimeEntries, setTeLoad);
    load('/insights/screen-time', setScreenEntries, setStLoad);
    load('/insights/procrastination', setProcEntries, setPrLoad);
    load('/insights/not-to-do', setNotToDos, setNtLoad);
    load('/insights/triggers', setTriggers, setTrLoad);
    load('/insights/bad-decisions', setDecisions, setDcLoad);
    load('/insights/weaknesses', setWeaknesses, setWkLoad);
  }, []);

  const reloadAg = () => load('/insights/anti-goals', setAntiGoals, setAgLoad);
  const reloadHg = () => load('/insights/habit-graveyard', setHabits, setHgLoad);
  const reloadTe = () => load('/insights/time-entries', setTimeEntries, setTeLoad);
  const reloadSt = () => load('/insights/screen-time', setScreenEntries, setStLoad);
  const reloadPr = () => load('/insights/procrastination', setProcEntries, setPrLoad);
  const reloadNt = () => load('/insights/not-to-do', setNotToDos, setNtLoad);
  const reloadTr = () => load('/insights/triggers', setTriggers, setTrLoad);
  const reloadDc = () => load('/insights/bad-decisions', setDecisions, setDcLoad);
  const reloadWk = () => load('/insights/weaknesses', setWeaknesses, setWkLoad);

  // ── Group by date ──────────────────────────────────────────────────────
  const groupByDate = (entries) => {
    const map = {};
    entries.forEach(e => { const d = e.date || ''; if (!map[d]) map[d] = []; map[d].push(e); });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)); // newest first
  };
  const teByDate = useMemo(() => groupByDate(timeEntries), [timeEntries]);
  const stByDate = useMemo(() => groupByDate(screenEntries), [screenEntries]);

  // ── Time Tracking: add day ─────────────────────────────────────────────
  const openTeAdd = (date = TODAY) => {
    setTeDate(date);
    setTeRows([{ category: '', hours: '' }]);
    setTeEditEntry(null);
    setTeModal(true);
  };
  const openTeEdit = (entry) => {
    setTeEditEntry(entry);
    setTeEditForm({ category: entry.category, hours: entry.hours, notes: entry.notes || '' });
    setTeModal(true);
  };
  const handleTeSave = async () => {
    if (teEditEntry) {
      // single edit
      if (!teEditForm.category.trim() || !teEditForm.hours) return toast.error('Fill all fields');
      setSaving(true);
      try {
        await API.put(`/insights/time-entries/${teEditEntry.id}`, { date: teEditEntry.date, ...teEditForm, hours: +teEditForm.hours });
        toast.success('Updated'); setTeModal(false); reloadTe();
      } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
    } else {
      // multi-row add
      const valid = teRows.filter(r => r.category.trim() && +r.hours > 0);
      if (!valid.length) return toast.error('Add at least one valid entry');
      const total = valid.reduce((s, r) => s + +r.hours, 0);
      if (total > 24) return toast.error('Total hours exceed 24h');
      setSaving(true);
      try {
        await Promise.all(valid.map(r => API.post('/insights/time-entries', { date: teDate, category: r.category, hours: +r.hours, notes: '' })));
        toast.success(`⏱ ${valid.length} entr${valid.length > 1 ? 'ies' : 'y'} logged`);
        setTeModal(false); reloadTe();
      } catch (e) { toast.error(getErrorMessage(e, 'Failed to save')); } finally { setSaving(false); }
    }
  };
  const handleTeDelete = (item) => setConfirm({
    title: 'Delete entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { try { await API.delete(`/insights/time-entries/${item.id}`); toast.success('Deleted'); reloadTe(); } catch { } }
  });

  // ── Screen Time: add day ───────────────────────────────────────────────
  const openStAdd = (date = TODAY) => {
    setStDate(date);
    setStRows([{ app_category: '', hours: '' }]);
    setStEditEntry(null);
    setStModal(true);
  };
  const openStEdit = (entry) => {
    setStEditEntry(entry);
    setStEditForm({ app_category: entry.app_category, hours: entry.hours, notes: entry.notes || '' });
    setStModal(true);
  };
  const handleStSave = async () => {
    if (stEditEntry) {
      if (!stEditForm.app_category.trim() || !stEditForm.hours) return toast.error('Fill all fields');
      setSaving(true);
      try {
        await API.put(`/insights/screen-time/${stEditEntry.id}`, { date: stEditEntry.date, ...stEditForm, hours: +stEditForm.hours });
        toast.success('Updated'); setStModal(false); reloadSt();
      } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
    } else {
      const valid = stRows.filter(r => r.app_category.trim() && +r.hours > 0);
      if (!valid.length) return toast.error('Add at least one valid entry');
      const total = valid.reduce((s, r) => s + +r.hours, 0);
      if (total > 24) return toast.error('Total hours exceed 24h');
      setSaving(true);
      try {
        await Promise.all(valid.map(r => API.post('/insights/screen-time', { date: stDate, app_category: r.app_category, hours: +r.hours, notes: '' })));
        toast.success(`📱 ${valid.length} entr${valid.length > 1 ? 'ies' : 'y'} logged`);
        setStModal(false); reloadSt();
      } catch (e) { toast.error(getErrorMessage(e, 'Failed to save')); } finally { setSaving(false); }
    }
  };
  const handleStDelete = (item) => setConfirm({
    title: 'Delete entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { try { await API.delete(`/insights/screen-time/${item.id}`); toast.success('Deleted'); reloadSt(); } catch { } }
  });

  // ── Anti-Goals CRUD ────────────────────────────────────────────────────
  const openAgCreate = () => { setAgEdit(null); setAgForm({ text: '', reason: '' }); setAgModal(true); };
  const openAgEdit = (i) => { setAgEdit(i); setAgForm({ text: i.text, reason: i.reason || '' }); setAgModal(true); };
  const handleAgSave = async () => {
    if (!agForm.text.trim()) return toast.error('Describe what you want to avoid');
    setSaving(true);
    try {
      agEdit ? await API.put(`/insights/anti-goals/${agEdit.id}`, agForm) : await API.post('/insights/anti-goals', agForm);
      toast.success(agEdit ? 'Updated' : '🚫 Added'); setAgModal(false); reloadAg();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handleAgDelete = (item) => setConfirm({
    title: 'Delete Anti-Goal?', message: `Remove "${item.text}"?`, confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/anti-goals/${item.id}`); toast.success('Deleted'); reloadAg(); }
  });

  // ── Habit Graveyard CRUD ───────────────────────────────────────────────
  const openHgCreate = () => { setHgEdit(null); setHgForm({ habit: '', reason: '', started_at: '', abandoned_at: '' }); setHgModal(true); };
  const openHgEdit = (i) => { setHgEdit(i); setHgForm({ habit: i.habit, reason: i.reason || '', started_at: i.started_at || '', abandoned_at: i.abandoned_at || '' }); setHgModal(true); };
  const handleHgSave = async () => {
    if (!hgForm.habit.trim()) return toast.error('Name the habit');
    setSaving(true);
    try {
      hgEdit ? await API.put(`/insights/habit-graveyard/${hgEdit.id}`, hgForm) : await API.post('/insights/habit-graveyard', hgForm);
      toast.success(hgEdit ? 'Updated' : '🪦 Habit laid to rest'); setHgModal(false); reloadHg();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handleHgDelete = (item) => setConfirm({
    title: 'Remove from Graveyard?', message: `Remove "${item.habit}"?`, confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/habit-graveyard/${item.id}`); toast.success('Removed'); reloadHg(); }
  });

  // ── Procrastination CRUD ───────────────────────────────────────────────
  const openPrCreate = () => { setPrEdit(null); setPrForm({ date: TODAY, what: '', why: '', outcome: '' }); setPrModal(true); };
  const openPrEdit = (i) => { setPrEdit(i); setPrForm({ date: i.date, what: i.what, why: i.why || '', outcome: i.outcome || '' }); setPrModal(true); };
  const handlePrSave = async () => {
    if (!prForm.what.trim()) return toast.error('What did you avoid?');
    setSaving(true);
    try {
      prEdit ? await API.put(`/insights/procrastination/${prEdit.id}`, prForm) : await API.post('/insights/procrastination', prForm);
      toast.success(prEdit ? 'Updated' : '😬 Logged'); setPrModal(false); reloadPr();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handlePrDelete = (item) => setConfirm({
    title: 'Delete entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/procrastination/${item.id}`); toast.success('Deleted'); reloadPr(); }
  });

  // ── Not-to-do CRUD ─────────────────────────────────────────────────────
  const openNtCreate = () => { setNtEdit(null); setNtForm({ text: '', reason: '' }); setNtModal(true); };
  const openNtEdit = (i) => { setNtEdit(i); setNtForm({ text: i.text, reason: i.reason || '' }); setNtModal(true); };
  const handleNtSave = async () => {
    if (!ntForm.text.trim()) return toast.error('Describe the time-waster');
    setSaving(true);
    try {
      ntEdit ? await API.put(`/insights/not-to-do/${ntEdit.id}`, ntForm) : await API.post('/insights/not-to-do', ntForm);
      toast.success(ntEdit ? 'Updated' : '🚷 Added'); setNtModal(false); reloadNt();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handleNtDelete = (item) => setConfirm({
    title: 'Delete item?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/not-to-do/${item.id}`); toast.success('Deleted'); reloadNt(); }
  });

  // ── Trigger Journal CRUD ───────────────────────────────────────────────
  const openTrCreate = () => { setTrEdit(null); setTrForm({ trigger: '', behavior: '', consequence: '', guard: '', date: TODAY }); setTrModal(true); };
  const openTrEdit   = (i) => { setTrEdit(i); setTrForm({ trigger: i.trigger, behavior: i.behavior, consequence: i.consequence || '', guard: i.guard || '', date: i.date || TODAY }); setTrModal(true); };
  const handleTrSave = async () => {
    if (!trForm.trigger.trim() || !trForm.behavior.trim()) return toast.error('Trigger and behavior are required');
    setSaving(true);
    try {
      trEdit ? await API.put(`/insights/triggers/${trEdit.id}`, trForm) : await API.post('/insights/triggers', trForm);
      toast.success(trEdit ? 'Updated' : '🎯 Logged'); setTrModal(false); reloadTr();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handleTrDelete = (item) => setConfirm({
    title: 'Delete Trigger?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/triggers/${item.id}`); toast.success('Deleted'); reloadTr(); }
  });

  // ── Bad Decisions CRUD ─────────────────────────────────────────────────
  const openDcCreate = () => { setDcEdit(null); setDcForm({ decision: '', what_went_wrong: '', root_cause: '', do_differently: '', domain: 'General', date: TODAY }); setDcModal(true); };
  const openDcEdit   = (i) => { setDcEdit(i); setDcForm({ decision: i.decision, what_went_wrong: i.what_went_wrong || '', root_cause: i.root_cause || '', do_differently: i.do_differently || '', domain: i.domain || 'General', date: i.date || TODAY }); setDcModal(true); };
  const handleDcSave = async () => {
    if (!dcForm.decision.trim()) return toast.error('Describe the decision');
    setSaving(true);
    try {
      dcEdit ? await API.put(`/insights/bad-decisions/${dcEdit.id}`, dcForm) : await API.post('/insights/bad-decisions', dcForm);
      toast.success(dcEdit ? 'Updated' : '💀 Logged'); setDcModal(false); reloadDc();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handleDcDelete = (item) => setConfirm({
    title: 'Delete entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/bad-decisions/${item.id}`); toast.success('Deleted'); reloadDc(); }
  });

  // ── Weakness Map CRUD ──────────────────────────────────────────────────
  const openWkCreate = () => { setWkEdit(null); setWkForm({ weakness: '', description: '', severity: 3, frequency: 3, guard_system: '' }); setWkModal(true); };
  const openWkEdit   = (i) => { setWkEdit(i); setWkForm({ weakness: i.weakness, description: i.description || '', severity: i.severity || 3, frequency: i.frequency || 3, guard_system: i.guard_system || '' }); setWkModal(true); };
  const handleWkSave = async () => {
    if (!wkForm.weakness.trim()) return toast.error('Name the weakness');
    setSaving(true);
    try {
      wkEdit ? await API.put(`/insights/weaknesses/${wkEdit.id}`, wkForm) : await API.post('/insights/weaknesses', wkForm);
      toast.success(wkEdit ? 'Updated' : '🧩 Mapped'); setWkModal(false); reloadWk();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };
  const handleWkDelete = (item) => setConfirm({
    title: 'Remove Weakness?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => { await API.delete(`/insights/weaknesses/${item.id}`); toast.success('Removed'); reloadWk(); }
  });

  // ── Rating bar helper ──────────────────────────────────────────────────
  const RatingBar = ({ value, color }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i < value ? color : 'rgba(13,13,13,0.08)' }} />
      ))}
    </div>
  );

  // ── Preview modal ──────────────────────────────────────────────────────

  const PreviewModal = ({ item, onClose, icon, iconBg, titleColor, title, subtitle, body }) => item && (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ background: 'rgba(13,13,13,0.85)', zIndex: 1100 }}>
      <div className="modal modal-md">
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

  return (
    <div>
      <div className="page-header">
        <h2>Insight Lab 🔬</h2>
        <p>Clarity through contrast — define what you reject, track your time, and learn from patterns.</p>
      </div>

      <div className="page-body">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 32, background: 'var(--mist)', padding: 4, borderRadius: 14, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="insights-tab-btn" style={{
              padding: '9px 15px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? tab.color : 'rgba(13,13,13,0.45)',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span className="tab-icon" style={{ fontSize: 14 }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: Anti-Goals
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'anti-goals' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🚫 Anti-Goals</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Things you actively want to avoid, stop, or never become.</p></div>
              <button className="btn btn-primary" onClick={openAgCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Anti-Goal</button>
            </div>
            {agLoad ? <Skeletons /> : antiGoals.length === 0 ? (
              <Empty icon="🚫" title="None defined yet" desc="Anti-goals clarify your direction by naming what you're moving away from." onAdd={openAgCreate} label="+ Add First Anti-Goal" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {antiGoals.map(item => (
                  <div key={item.id} onClick={() => setAgPreview(item)} className="card"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid var(--rust)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(196,98,58,0.1)')} onMouseLeave={offHover()}>
                    <span style={{ fontSize: 24, marginTop: 2 }}>🚫</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{item.text}</div>
                      {item.reason && <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><MarkdownRenderer content={item.reason} /></div>}
                      <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.3)', marginTop: 6, fontWeight: 500 }}>Added {dateLabel(item.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openAgEdit(item)} style={{ padding: 6 }}>✎</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleAgDelete(item)} style={{ padding: 6, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Habit Graveyard
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'graveyard' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🪦 Habit Graveyard</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Habits you tried and abandoned — with the lesson learned.</p></div>
              <button className="btn btn-primary" onClick={openHgCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Habit</button>
            </div>
            {hgLoad ? <Skeletons h={100} /> : habits.length === 0 ? (
              <Empty icon="🪦" title="Graveyard is empty" desc="Every abandoned habit holds a lesson. Bury it here so you can learn from it." onAdd={openHgCreate} label="+ Log First Habit" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                {habits.map(item => (
                  <div key={item.id} onClick={() => setHgPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #8b6bc4', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(139,107,196,0.12)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 22 }}>🪦</span><div style={{ fontWeight: 700, fontSize: 16 }}>{item.habit}</div></div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openHgEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleHgDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
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
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Time Tracking  (DAY-CENTRIC)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'time' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>⏱ Time Tracking</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>How did you spend your 24 hours today?</p></div>
              <button className="btn btn-primary" onClick={() => openTeAdd(TODAY)} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Today</button>
            </div>

            {teLoad ? <Skeletons n={2} h={140} /> : teByDate.length === 0 ? (
              <Empty icon="⏱" title="No time logged yet" desc="Track where your hours go — awareness is the first step to reclaiming your day." onAdd={() => openTeAdd(TODAY)} label="+ Log Today's Time" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {teByDate.map(([date, entries]) => {
                  const total = entries.reduce((s, e) => s + +e.hours, 0);
                  return (
                    <div key={date} className="card" style={{ borderLeft: '4px solid var(--sage)' }}>
                      {/* Day header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{dayLabel(date)}</div>
                          <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>{total.toFixed(1)}h tracked · {(24 - total).toFixed(1)}h untracked</div>
                        </div>
                        <button className="btn btn-sm btn-outline" onClick={() => openTeAdd(date)} style={{ borderRadius: 20, fontSize: 11 }}>+ Add more</button>
                      </div>

                      {/* Stacked bar */}
                      <HoursBar entries={entries} colorMap={teColorMap} keyField="category" />

                      {/* Entry rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {entries.map(e => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(13,13,13,0.02)', border: '1px solid rgba(13,13,13,0.04)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor(e.category, teColorMap), flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{e.category}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sage)' }}>{+e.hours}h</span>
                            {e.notes && <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes}</span>}
                            <button className="btn btn-sm btn-ghost" onClick={() => openTeEdit(e)} style={{ padding: '3px 6px', fontSize: 11 }}>✎</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleTeDelete(e)} style={{ padding: '3px 6px', fontSize: 11, color: 'rgba(13,13,13,0.2)' }}>🗑</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Screen Time  (DAY-CENTRIC)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'screen' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>📱 Screen Time</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Log phone/computer usage by app category across your day.</p></div>
              <button className="btn btn-primary" onClick={() => openStAdd(TODAY)} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Today</button>
            </div>

            {stLoad ? <Skeletons n={2} h={140} /> : stByDate.length === 0 ? (
              <Empty icon="📱" title="No screen time logged" desc="Know where your attention really goes. Log it to see the true picture." onAdd={() => openStAdd(TODAY)} label="+ Log Today's Screen Time" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {stByDate.map(([date, entries]) => {
                  const total = entries.reduce((s, e) => s + +e.hours, 0);
                  return (
                    <div key={date} className="card" style={{ borderLeft: '4px solid #5b8ba8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{dayLabel(date)}</div>
                          <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>{total.toFixed(1)}h on screens</div>
                        </div>
                        <button className="btn btn-sm btn-outline" onClick={() => openStAdd(date)} style={{ borderRadius: 20, fontSize: 11 }}>+ Add more</button>
                      </div>

                      <HoursBar entries={entries} colorMap={stColorMap} keyField="app_category" />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {entries.map(e => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(13,13,13,0.02)', border: '1px solid rgba(13,13,13,0.04)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor(e.app_category, stColorMap), flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{e.app_category}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#5b8ba8' }}>{+e.hours}h</span>
                            {e.notes && <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes}</span>}
                            <button className="btn btn-sm btn-ghost" onClick={() => openStEdit(e)} style={{ padding: '3px 6px', fontSize: 11 }}>✎</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleStDelete(e)} style={{ padding: '3px 6px', fontSize: 11, color: 'rgba(13,13,13,0.2)' }}>🗑</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Procrastination Log
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'procrastination' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>😬 Procrastination Log</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>What you avoided, why, and what actually happened.</p></div>
              <button className="btn btn-primary" onClick={openPrCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Entry</button>
            </div>
            {prLoad ? <Skeletons h={110} /> : procEntries.length === 0 ? (
              <Empty icon="😬" title="Nothing logged yet" desc="Naming procrastination breaks its power." onAdd={openPrCreate} label="+ Log First Entry" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                {procEntries.map(item => (
                  <div key={item.id} onClick={() => setPrPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #c9a84c', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(201,168,76,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div><div style={{ fontSize: 10, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 4 }}>{dateLabel(item.date)}</div><div style={{ fontWeight: 700, fontSize: 15 }}>{item.what}</div></div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openPrEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handlePrDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.why && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginBottom: 6 }}>Why: {item.why.slice(0, 80)}{item.why.length > 80 ? '…' : ''}</div>}
                    {item.outcome && <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>→ {item.outcome.slice(0, 60)}{item.outcome.length > 60 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Not-to-do List
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'nottodo' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>🚷 Not-to-do List</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Recurring time-wasters to consciously eliminate.</p></div>
              <button className="btn btn-primary" onClick={openNtCreate} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Add Item</button>
            </div>
            {ntLoad ? <Skeletons /> : notToDos.length === 0 ? (
              <Empty icon="🚷" title="List is empty" desc="A not-to-do list is as powerful as a to-do list. Name your recurring traps." onAdd={openNtCreate} label="+ Add First Item" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notToDos.map(item => (
                  <div key={item.id} onClick={() => setNtPreview(item)} className="card"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: '4px solid #c4623a', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(196,98,58,0.1)')} onMouseLeave={offHover()}>
                    <span style={{ fontSize: 22, marginTop: 2 }}>🚷</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{item.text}</div>
                      {item.reason && <div className="markdown-body" style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><MarkdownRenderer content={item.reason} /></div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openNtEdit(item)} style={{ padding: 5 }}>✎</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleNtDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Trigger Journal
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'triggers' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, marginBottom: 4 }}>🎯 Trigger Journal</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Situation → Behavior → Consequence → Guard system.</p>
              </div>
              <button className="btn btn-primary" onClick={openTrCreate} style={{ borderRadius: 30, padding: '10px 22px', background: '#e05a77', borderColor: '#e05a77' }}>+ Log Trigger</button>
            </div>
            {trLoad ? <Skeletons h={110} /> : triggers.length === 0 ? (
              <Empty icon="🎯" title="No triggers logged" desc="Break negative cycles by naming what sets them off. Awareness is the cure." onAdd={openTrCreate} label="+ Log First Trigger" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {triggers.map(item => (
                  <div key={item.id} onClick={() => setTrPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #e05a77', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(224,90,119,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: '#e05a77', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 4 }}>{item.date}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>🎯 {item.trigger}</span>
                          <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>→</span>
                          <span style={{ fontSize: 13, color: 'rgba(13,13,13,0.65)' }}>{item.behavior.slice(0, 60)}{item.behavior.length > 60 ? '…' : ''}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openTrEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleTrDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.guard && <div style={{ fontSize: 12, color: '#e05a77', fontWeight: 600, marginTop: 6 }}>🛡 Guard: {item.guard.slice(0, 80)}{item.guard.length > 80 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Bad Decisions
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'decisions' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, marginBottom: 4 }}>💀 Bad Decision Journal</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Post-mortem your poor choices — process, not just outcome.</p>
              </div>
              <button className="btn btn-primary" onClick={openDcCreate} style={{ borderRadius: 30, padding: '10px 22px', background: '#7a5c8a', borderColor: '#7a5c8a' }}>+ Log Decision</button>
            </div>
            {dcLoad ? <Skeletons h={110} /> : decisions.length === 0 ? (
              <Empty icon="💀" title="No decisions logged" desc="The best investors keep a decision journal. Start yours — every bad call is a lesson." onAdd={openDcCreate} label="+ Log First Decision" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
                {decisions.map(item => (
                  <div key={item.id} onClick={() => setDcPreview(item)} className="card"
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
                        <button className="btn btn-sm btn-ghost" onClick={() => openDcEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDcDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    {item.what_went_wrong && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.what_went_wrong}</div>}
                    {item.do_differently && <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>→ {item.do_differently.slice(0, 70)}{item.do_differently.length > 70 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: Weakness Map
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'weaknesses' && (
          <>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, marginBottom: 4 }}>🧩 Weakness / Temptation Map</h3>
                <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>Know your vulnerabilities — rated by severity and frequency — and build guards.</p>
              </div>
              <button className="btn btn-primary" onClick={openWkCreate} style={{ borderRadius: 30, padding: '10px 22px', background: '#b87333', borderColor: '#b87333' }}>+ Map Weakness</button>
            </div>
            {wkLoad ? <Skeletons h={120} /> : weaknesses.length === 0 ? (
              <Empty icon="🧩" title="Map is empty" desc="Knowing your weaknesses is a superpower. Map them honestly and build guard systems." onAdd={openWkCreate} label="+ Map First Weakness" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
                {weaknesses.map(item => (
                  <div key={item.id} onClick={() => setWkPreview(item)} className="card"
                    style={{ borderLeft: '4px solid #b87333', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={onHover('rgba(184,115,51,0.1)')} onMouseLeave={offHover()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>🧩 {item.weakness}</div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openWkEdit(item)} style={{ padding: 5 }}>✎</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleWkDelete(item)} style={{ padding: 5, color: 'rgba(13,13,13,0.25)' }}>🗑</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.45)', fontWeight: 600 }}>Severity</span>
                        <RatingBar value={item.severity || 3} color="#e05a77" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.45)', fontWeight: 600 }}>Frequency</span>
                        <RatingBar value={item.frequency || 3} color="#b87333" />
                      </div>
                    </div>
                    {item.description && <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.55)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>{item.description}</div>}
                    {item.guard_system && <div style={{ fontSize: 12, color: '#b87333', fontWeight: 600 }}>🛡 {item.guard_system.slice(0, 80)}{item.guard_system.length > 80 ? '…' : ''}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      {/* ════════════════════════ MODALS ════════════════════════ */}

      {/* Anti-Goal */}
      {agModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAgModal(false)}><div className="modal">
        <div className="modal-header"><h3>{agEdit ? 'Edit Anti-Goal' : 'New Anti-Goal'}</h3><button className="modal-close" onClick={() => setAgModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">What do you want to avoid or stop?</label><input maxLength={200} className="form-input" value={agForm.text} onChange={e => setAgForm({ ...agForm, text: e.target.value })} placeholder="e.g. Mindless scrolling before bed…" /></div>
        <div className="form-group"><label className="form-label">Why? (optional)</label><textarea maxLength={2000} className="form-textarea" value={agForm.reason} onChange={e => setAgForm({ ...agForm, reason: e.target.value })} placeholder="What harm does it cause?" style={{ minHeight: 90 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setAgModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleAgSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : agEdit ? 'Save Changes' : 'Add Anti-Goal'}</button></div>
      </div></div>)}

      {/* Habit Graveyard */}
      {hgModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHgModal(false)}><div className="modal">
        <div className="modal-header"><h3>{hgEdit ? 'Edit Entry' : 'Log to Graveyard'}</h3><button className="modal-close" onClick={() => setHgModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Habit name</label><input maxLength={200} className="form-input" value={hgForm.habit} onChange={e => setHgForm({ ...hgForm, habit: e.target.value })} placeholder="e.g. Cold showers…" /></div>
        <div className="form-group"><label className="form-label">Why did you abandon it?</label><textarea maxLength={2000} className="form-textarea" value={hgForm.reason} onChange={e => setHgForm({ ...hgForm, reason: e.target.value })} placeholder="What made it not stick?" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Started (optional)</label><input maxLength={200} type="date" className="form-input" value={hgForm.started_at} onChange={e => setHgForm({ ...hgForm, started_at: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Abandoned (optional)</label><input maxLength={200} type="date" className="form-input" value={hgForm.abandoned_at} onChange={e => setHgForm({ ...hgForm, abandoned_at: e.target.value })} /></div>
        </div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12, marginTop: 20 }}><button className="btn btn-outline" onClick={() => setHgModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleHgSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : hgEdit ? 'Save Changes' : 'Bury the Habit'}</button></div>
      </div></div>)}

      {/* Time Tracking Modal */}
      {teModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTeModal(false)}><div className="modal modal-lg">
        <div className="modal-header">
          <h3>{teEditEntry ? 'Edit Entry' : `Log Time — ${dateLabel(teDate)}`}</h3>
          <button className="modal-close" onClick={() => setTeModal(false)}>✕</button>
        </div>
        {!teEditEntry && (
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Date</label>
            <input maxLength={200} type="date" className="form-input" value={teDate} onChange={e => setTeDate(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
        )}
        {teEditEntry ? (
          <>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Category</label><input maxLength={200} className="form-input" value={teEditForm.category} onChange={e => setTeEditForm({ ...teEditForm, category: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Hours</label><input maxLength={200} type="number" className="form-input" value={teEditForm.hours} onChange={e => setTeEditForm({ ...teEditForm, hours: e.target.value })} min="0.1" step="0.25" /></div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notes (optional)</label><input maxLength={200} className="form-input" value={teEditForm.notes} onChange={e => setTeEditForm({ ...teEditForm, notes: e.target.value })} placeholder="Any detail?" /></div>
          </>
        ) : (
          <>
            <label className="form-label" style={{ marginBottom: 10 }}>Categories & hours <span style={{ color: 'rgba(13,13,13,0.4)', fontWeight: 400, fontSize: 12 }}>— add as many as needed</span></label>
            <MultiRowEditor rows={teRows} setRows={setTeRows} keyLabel="category" keyPlaceholder="Work / Learning / Leisure…" color="var(--sage)" />
          </>
        )}
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-outline" onClick={() => setTeModal(false)} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleTeSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : teEditEntry ? 'Save Changes' : 'Log Time'}</button>
        </div>
      </div></div>)}

      {/* Screen Time Modal */}
      {stModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setStModal(false)}><div className="modal modal-lg">
        <div className="modal-header">
          <h3>{stEditEntry ? 'Edit Entry' : `Log Screen Time — ${dateLabel(stDate)}`}</h3>
          <button className="modal-close" onClick={() => setStModal(false)}>✕</button>
        </div>
        {!stEditEntry && (
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Date</label>
            <input maxLength={200} type="date" className="form-input" value={stDate} onChange={e => setStDate(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
        )}
        {stEditEntry ? (
          <>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">App Category</label><input maxLength={200} className="form-input" value={stEditForm.app_category} onChange={e => setStEditForm({ ...stEditForm, app_category: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Hours</label><input maxLength={200} type="number" className="form-input" value={stEditForm.hours} onChange={e => setStEditForm({ ...stEditForm, hours: e.target.value })} min="0.1" step="0.25" /></div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notes (optional)</label><input maxLength={200} className="form-input" value={stEditForm.notes} onChange={e => setStEditForm({ ...stEditForm, notes: e.target.value })} placeholder="Any detail?" /></div>
          </>
        ) : (
          <>
            <label className="form-label" style={{ marginBottom: 10 }}>App categories & hours <span style={{ color: 'rgba(13,13,13,0.4)', fontWeight: 400, fontSize: 12 }}>— add as many as needed</span></label>
            <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Social', 'News', 'Work', 'Entertainment', 'Gaming', 'Learning', 'Other'].map(cat => (
                <button key={cat} onClick={() => setStRows([...stRows, { app_category: cat, hours: '' }])}
                  style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--mist)', border: '1px solid rgba(13,13,13,0.08)', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#5b8ba8' }}>
                  + {cat}
                </button>
              ))}
            </div>
            <MultiRowEditor rows={stRows} setRows={setStRows} keyLabel="app_category" keyPlaceholder="Social / News / Work…" color="#5b8ba8" />
          </>
        )}
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-outline" onClick={() => setStModal(false)} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : stEditEntry ? 'Save Changes' : 'Log Screen Time'}</button>
        </div>
      </div></div>)}

      {/* Procrastination */}
      {prModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPrModal(false)}><div className="modal">
        <div className="modal-header"><h3>{prEdit ? 'Edit Entry' : 'Log Procrastination'}</h3><button className="modal-close" onClick={() => setPrModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Date</label><input maxLength={200} type="date" className="form-input" value={prForm.date} onChange={e => setPrForm({ ...prForm, date: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">What did you avoid?</label><input maxLength={200} className="form-input" value={prForm.what} onChange={e => setPrForm({ ...prForm, what: e.target.value })} placeholder="e.g. Writing that overdue report…" /></div>
        <div className="form-group"><label className="form-label">Why? (optional)</label><textarea maxLength={2000} className="form-textarea" value={prForm.why} onChange={e => setPrForm({ ...prForm, why: e.target.value })} placeholder="Fear, overwhelm, distraction?" style={{ minHeight: 70 }} /></div>
        <div className="form-group"><label className="form-label">Outcome (optional)</label><textarea maxLength={2000} className="form-textarea" value={prForm.outcome} onChange={e => setPrForm({ ...prForm, outcome: e.target.value })} placeholder="Did you eventually do it? What happened?" style={{ minHeight: 70 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setPrModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handlePrSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : prEdit ? 'Save Changes' : 'Log Entry'}</button></div>
      </div></div>)}

      {/* Not-to-do */}
      {ntModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNtModal(false)}><div className="modal">
        <div className="modal-header"><h3>{ntEdit ? 'Edit Item' : 'Add Not-to-do'}</h3><button className="modal-close" onClick={() => setNtModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">What's the time-waster?</label><input maxLength={200} className="form-input" value={ntForm.text} onChange={e => setNtForm({ ...ntForm, text: e.target.value })} placeholder="e.g. Checking email first thing in the morning…" /></div>
        <div className="form-group"><label className="form-label">Why avoid it? (optional)</label><textarea maxLength={2000} className="form-textarea" value={ntForm.reason} onChange={e => setNtForm({ ...ntForm, reason: e.target.value })} placeholder="Why is this a trap for you?" style={{ minHeight: 80 }} /><div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setNtModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleNtSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : ntEdit ? 'Save Changes' : 'Add to List'}</button></div>
      </div></div>)}

      {/* Trigger Journal Modal */}
      {trModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTrModal(false)}><div className="modal">
        <div className="modal-header"><h3>{trEdit ? 'Edit Entry' : 'Log a Trigger'}</h3><button className="modal-close" onClick={() => setTrModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={trForm.date} onChange={e => setTrForm({ ...trForm, date: e.target.value })} style={{ maxWidth: 200 }} /></div>
        <div className="form-group"><label className="form-label">Trigger (the situation)</label><input maxLength={300} className="form-input" value={trForm.trigger} onChange={e => setTrForm({ ...trForm, trigger: e.target.value })} placeholder="e.g. When I'm stressed before a deadline…" /></div>
        <div className="form-group"><label className="form-label">Behavior (what you did)</label><textarea maxLength={500} className="form-textarea" value={trForm.behavior} onChange={e => setTrForm({ ...trForm, behavior: e.target.value })} placeholder="e.g. I opened YouTube and watched for 2 hours" style={{ minHeight: 80 }} /></div>
        <div className="form-group"><label className="form-label">Consequence (what it cost) — optional</label><textarea maxLength={1000} className="form-textarea" value={trForm.consequence} onChange={e => setTrForm({ ...trForm, consequence: e.target.value })} placeholder="e.g. Missed the deadline, felt guilty" style={{ minHeight: 70 }} /></div>
        <div className="form-group"><label className="form-label">Guard System (how to prevent) — optional</label><textarea maxLength={1000} className="form-textarea" value={trForm.guard} onChange={e => setTrForm({ ...trForm, guard: e.target.value })} placeholder="e.g. Block YouTube on days with deadlines, use Forest app" style={{ minHeight: 70 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setTrModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleTrSave} disabled={saving} style={{ flex: 1, background: '#e05a77', borderColor: '#e05a77' }}>{saving ? 'Saving…' : trEdit ? 'Save Changes' : 'Log Trigger'}</button></div>
      </div></div>)}

      {/* Bad Decision Modal */}
      {dcModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDcModal(false)}><div className="modal">
        <div className="modal-header"><h3>{dcEdit ? 'Edit Entry' : 'Log a Bad Decision'}</h3><button className="modal-close" onClick={() => setDcModal(false)}>✕</button></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input type="date" className="form-input" value={dcForm.date} onChange={e => setDcForm({ ...dcForm, date: e.target.value })} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Domain</label>
            <select className="form-input" value={dcForm.domain} onChange={e => setDcForm({ ...dcForm, domain: e.target.value })}>
              {['General','Work','Finance','Health','Relationships','Personal Growth','Business','Other'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">The Decision</label><input maxLength={300} className="form-input" value={dcForm.decision} onChange={e => setDcForm({ ...dcForm, decision: e.target.value })} placeholder="e.g. Skipped due diligence and invested impulsively" /></div>
        <div className="form-group"><label className="form-label">What went wrong?</label><textarea maxLength={2000} className="form-textarea" value={dcForm.what_went_wrong} onChange={e => setDcForm({ ...dcForm, what_went_wrong: e.target.value })} placeholder="Describe the outcome and how it played out" style={{ minHeight: 90 }} /></div>
        <div className="form-group"><label className="form-label">Root cause (optional)</label><textarea maxLength={1000} className="form-textarea" value={dcForm.root_cause} onChange={e => setDcForm({ ...dcForm, root_cause: e.target.value })} placeholder="Fear, ego, lack of information, peer pressure?" style={{ minHeight: 70 }} /></div>
        <div className="form-group"><label className="form-label">What would you do differently? (optional)</label><textarea maxLength={1000} className="form-textarea" value={dcForm.do_differently} onChange={e => setDcForm({ ...dcForm, do_differently: e.target.value })} placeholder="The rule or system you'd follow next time" style={{ minHeight: 70 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setDcModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleDcSave} disabled={saving} style={{ flex: 1, background: '#7a5c8a', borderColor: '#7a5c8a' }}>{saving ? 'Saving…' : dcEdit ? 'Save Changes' : 'Log Decision'}</button></div>
      </div></div>)}

      {/* Weakness Map Modal */}
      {wkModal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWkModal(false)}><div className="modal">
        <div className="modal-header"><h3>{wkEdit ? 'Edit Entry' : 'Map a Weakness'}</h3><button className="modal-close" onClick={() => setWkModal(false)}>✕</button></div>
        <div className="form-group"><label className="form-label">Weakness / Temptation</label><input maxLength={300} className="form-input" value={wkForm.weakness} onChange={e => setWkForm({ ...wkForm, weakness: e.target.value })} placeholder="e.g. I cave to social pressure to say yes" /></div>
        <div className="form-group"><label className="form-label">Description — how it manifests (optional)</label><textarea maxLength={2000} className="form-textarea" value={wkForm.description} onChange={e => setWkForm({ ...wkForm, description: e.target.value })} placeholder="When does this show up? In what situations?" style={{ minHeight: 90 }} /></div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Severity — {wkForm.severity}/5</label>
            <input type="range" min={1} max={5} value={wkForm.severity} onChange={e => setWkForm({ ...wkForm, severity: +e.target.value })} style={{ width: '100%' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Frequency — {wkForm.frequency}/5</label>
            <input type="range" min={1} max={5} value={wkForm.frequency} onChange={e => setWkForm({ ...wkForm, frequency: +e.target.value })} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="form-group"><label className="form-label">Guard System (optional)</label><textarea maxLength={1000} className="form-textarea" value={wkForm.guard_system} onChange={e => setWkForm({ ...wkForm, guard_system: e.target.value })} placeholder="What rule, system, or pre-commitment helps you resist this?" style={{ minHeight: 80 }} /></div>
        <div className="stack-on-mobile" style={{ display: 'flex', gap: 12 }}><button className="btn btn-outline" onClick={() => setWkModal(false)} style={{ flex: 1 }}>Cancel</button><button className="btn btn-primary" onClick={handleWkSave} disabled={saving} style={{ flex: 1, background: '#b87333', borderColor: '#b87333' }}>{saving ? 'Saving…' : wkEdit ? 'Save Changes' : 'Map Weakness'}</button></div>
      </div></div>)}

      {/* ═══ PREVIEW MODALS ═══ */}
      <PreviewModal item={agPreview} onClose={() => setAgPreview(null)} icon="🚫" iconBg="rgba(196,98,58,0.08)" titleColor="var(--rust)" title="Anti-Goal" subtitle={`Added ${agPreview ? dateLabel(agPreview.created_at) : ''}`} body={agPreview && (<>
        <div style={{ padding: '14px 18px', background: 'rgba(196,98,58,0.05)', borderRadius: 12, borderLeft: '4px solid var(--rust)', marginBottom: agPreview.reason ? 20 : 0 }}><p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{agPreview.text}</p></div>
        {agPreview.reason && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(13,13,13,0.4)', fontWeight: 800, marginBottom: 10 }}>Why I want to avoid this</div><MarkdownRenderer content={agPreview.reason} /></div>}
      </>)} />
      <PreviewModal item={hgPreview} onClose={() => setHgPreview(null)} icon="🪦" iconBg="linear-gradient(135deg,#f3eeff,#e8dcff)" titleColor="#8b6bc4" title={hgPreview?.habit} subtitle={[hgPreview?.started_at && `🌱 ${hgPreview.started_at}`, hgPreview?.abandoned_at && `🪦 ${hgPreview.abandoned_at}`].filter(Boolean).join(' → ')} body={hgPreview && (hgPreview.reason ? <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#f3eeff,#ede4ff)', borderRadius: 14, border: '1px solid rgba(139,107,196,0.2)' }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b6bc4', fontWeight: 800, marginBottom: 10 }}>Why it didn't stick</div><div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}><MarkdownRenderer content={hgPreview.reason} /></div></div> : <p style={{ color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>No reason recorded.</p>)} />
      <PreviewModal item={prPreview} onClose={() => setPrPreview(null)} icon="😬" iconBg="rgba(201,168,76,0.1)" titleColor="#c9a84c" title={prPreview?.what} subtitle={prPreview && dateLabel(prPreview.date)} body={prPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {prPreview.why && <div style={{ padding: '14px 18px', background: 'rgba(201,168,76,0.07)', borderRadius: 12, borderLeft: '4px solid #c9a84c' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: '#c9a84c', marginBottom: 8 }}>Why avoided</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{prPreview.why}</p></div>}
        {prPreview.outcome && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, color: 'var(--sage)', marginBottom: 8 }}>Outcome</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{prPreview.outcome}</p></div>}
      </div>)} />
      <PreviewModal item={ntPreview} onClose={() => setNtPreview(null)} icon="🚷" iconBg="rgba(196,98,58,0.08)" titleColor="#c4623a" title={ntPreview?.text} subtitle={ntPreview && `Added ${dateLabel(ntPreview.created_at)}`} body={ntPreview?.reason && <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.75, margin: 0 }}><MarkdownRenderer content={ntPreview.reason} /></div>} />
      <PreviewModal item={trPreview} onClose={() => setTrPreview(null)} icon="🎯" iconBg="rgba(224,90,119,0.1)" titleColor="#e05a77" title={trPreview?.trigger} subtitle={trPreview?.date} body={trPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '14px 18px', background: 'rgba(224,90,119,0.06)', borderRadius: 12, borderLeft: '4px solid #e05a77' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#e05a77', fontWeight: 800, marginBottom: 6 }}>Behavior</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{trPreview.behavior}</p></div>
        {trPreview.consequence && <div style={{ padding: '14px 18px', background: 'rgba(196,98,58,0.06)', borderRadius: 12, borderLeft: '4px solid var(--rust)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--rust)', fontWeight: 800, marginBottom: 6 }}>Consequence</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{trPreview.consequence}</p></div>}
        {trPreview.guard && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 800, marginBottom: 6 }}>🛡 Guard System</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{trPreview.guard}</p></div>}
      </div>)} />
      <PreviewModal item={dcPreview} onClose={() => setDcPreview(null)} icon="💀" iconBg="rgba(122,92,138,0.08)" titleColor="#7a5c8a" title={dcPreview?.decision} subtitle={dcPreview && `${dcPreview.domain} · ${dcPreview.date}`} body={dcPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {dcPreview.what_went_wrong && <div style={{ padding: '14px 18px', background: 'rgba(122,92,138,0.06)', borderRadius: 12, borderLeft: '4px solid #7a5c8a' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#7a5c8a', fontWeight: 800, marginBottom: 6 }}>What went wrong</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{dcPreview.what_went_wrong}</p></div>}
        {dcPreview.root_cause && <div style={{ padding: '14px 18px', background: 'rgba(201,168,76,0.06)', borderRadius: 12, borderLeft: '4px solid var(--gold)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)', fontWeight: 800, marginBottom: 6 }}>Root Cause</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{dcPreview.root_cause}</p></div>}
        {dcPreview.do_differently && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 800, marginBottom: 6 }}>→ Next Time</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{dcPreview.do_differently}</p></div>}
      </div>)} />
      <PreviewModal item={wkPreview} onClose={() => setWkPreview(null)} icon="🧩" iconBg="rgba(184,115,51,0.08)" titleColor="#b87333" title={wkPreview?.weakness} subtitle={wkPreview && `Severity ${wkPreview.severity}/5 · Frequency ${wkPreview.frequency}/5`} body={wkPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 24, padding: '12px 18px', background: 'rgba(184,115,51,0.05)', borderRadius: 12 }}>
          <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#b87333', fontWeight: 800, marginBottom: 8 }}>Severity</div><RatingBar value={wkPreview.severity || 3} color="#e05a77" /></div>
          <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#b87333', fontWeight: 800, marginBottom: 8 }}>Frequency</div><RatingBar value={wkPreview.frequency || 3} color="#b87333" /></div>
        </div>
        {wkPreview.description && <div style={{ padding: '14px 18px', background: 'rgba(13,13,13,0.03)', borderRadius: 12 }}><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, fontStyle: 'italic' }}>{wkPreview.description}</p></div>}
        {wkPreview.guard_system && <div style={{ padding: '14px 18px', background: 'rgba(107,140,107,0.06)', borderRadius: 12, borderLeft: '4px solid var(--sage)' }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--sage)', fontWeight: 800, marginBottom: 6 }}>🛡 Guard System</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{wkPreview.guard_system}</p></div>}
      </div>)} />

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
