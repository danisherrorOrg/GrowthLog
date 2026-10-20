import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';
import { localDate, PALETTE, catColor, Skeletons, Empty, dateLabel, dayLabel, HoursBar, MultiRowEditor } from './shared';

// Time Tracking and Screen Time are the same day-centric log with different wording
export const TIME_TRACKING = {
  endpoint: '/insights/time-entries',
  keyField: 'category',
  color: 'var(--sage)',
  icon: '⏱',
  title: 'Time Tracking',
  subtitle: 'How did you spend your 24 hours today?',
  emptyTitle: 'No time logged yet',
  emptyDesc: 'Track where your hours go — awareness is the first step to reclaiming your day.',
  emptyLabel: "+ Log Today's Time",
  dayTotal: (total) => `${total.toFixed(1)}h tracked · ${(24 - total).toFixed(1)}h untracked`,
  logLabel: 'Log Time',
  rowsLabel: 'Categories & hours',
  keyLabel: 'Category',
  keyPlaceholder: 'Work / Learning / Leisure…',
  quickPicks: [],
};

export const SCREEN_TIME = {
  endpoint: '/insights/screen-time',
  keyField: 'app_category',
  color: '#5b8ba8',
  icon: '📱',
  title: 'Screen Time',
  subtitle: 'Log phone/computer usage by app category across your day.',
  emptyTitle: 'No screen time logged',
  emptyDesc: 'Know where your attention really goes. Log it to see the true picture.',
  emptyLabel: "+ Log Today's Screen Time",
  dayTotal: (total) => `${total.toFixed(1)}h on screens`,
  logLabel: 'Log Screen Time',
  rowsLabel: 'App categories & hours',
  keyLabel: 'App Category',
  keyPlaceholder: 'Social / News / Work…',
  quickPicks: ['Social', 'News', 'Work', 'Entertainment', 'Gaming', 'Learning', 'Other'],
};

const groupByDate = (entries) => {
  const map = {};
  entries.forEach(e => { const d = e.date || ''; if (!map[d]) map[d] = []; map[d].push(e); });
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)); // newest first
};

export default function HoursLogTab({ config }) {
  const { endpoint, keyField, color } = config;
  const { user } = useAuth();
  const palette = user?.category_colors || PALETTE;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [date, setDate] = useState(localDate());
  const [rows, setRows] = useState([{ [keyField]: '', hours: '' }]);
  const [editEntry, setEditEntry] = useState(null); // single-entry edit
  const [editForm, setEditForm] = useState({ [keyField]: '', hours: '', notes: '' });
  const [colorMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get(endpoint); setEntries(r.data); }
    catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { reload(); }, [reload]);

  const byDate = useMemo(() => groupByDate(entries), [entries]);

  const openAdd = (day = localDate()) => {
    setDate(day);
    setRows([{ [keyField]: '', hours: '' }]);
    setEditEntry(null);
    setModal(true);
  };
  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({ [keyField]: entry[keyField], hours: entry.hours, notes: entry.notes || '' });
    setModal(true);
  };

  // Hours already saved for a day, leaving out the entry being edited
  const dayTotal = (day, skipId) => entries
    .filter(e => e.date === day && e.id !== skipId)
    .reduce((s, e) => s + (+e.hours || 0), 0);

  const handleSave = async () => {
    if (editEntry) {
      // single edit
      if (!editForm[keyField].trim() || !editForm.hours) return toast.error('Fill all fields');
      if (+editForm.hours <= 0) return toast.error('Hours must be more than 0');
      const others = dayTotal(editEntry.date, editEntry.id);
      if (others + +editForm.hours > 24) return toast.error(`Only ${+(24 - others).toFixed(2)}h left on this day`);
      setSaving(true);
      try {
        await API.put(`${endpoint}/${editEntry.id}`, { date: editEntry.date, ...editForm, hours: +editForm.hours });
        toast.success('Updated'); setModal(false); reload();
      } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
    } else {
      // multi-row add
      const valid = rows.filter(r => r[keyField].trim() && +r.hours > 0);
      if (!valid.length) return toast.error('Add at least one valid entry');
      const total = valid.reduce((s, r) => s + +r.hours, 0);
      const logged = dayTotal(date);
      if (logged + total > 24) {
        return toast.error(logged ? `Only ${+(24 - logged).toFixed(2)}h left on this day` : 'Total hours exceed 24h');
      }
      setSaving(true);
      try {
        await Promise.all(valid.map(r => API.post(endpoint, { date, [keyField]: r[keyField], hours: +r.hours, notes: '' })));
        toast.success(`${config.icon} ${valid.length} entr${valid.length > 1 ? 'ies' : 'y'} logged`);
        setModal(false); reload();
      } catch (e) { toast.error(getErrorMessage(e, 'Failed to save')); } finally { setSaving(false); }
    }
  };

  const handleDelete = (item) => setConfirm({
    title: 'Delete entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    onConfirm: async () => {
      try { await API.delete(`${endpoint}/${item.id}`); toast.success('Deleted'); reload(); }
      catch (e) { toast.error(getErrorMessage(e, 'Failed to delete')); }
    }
  });

  return (
    <>
      <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h3 style={{ fontSize: 20, marginBottom: 4 }}>{config.icon} {config.title}</h3><p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', margin: 0 }}>{config.subtitle}</p></div>
        <button className="btn btn-primary" onClick={() => openAdd(localDate())} style={{ borderRadius: 30, padding: '10px 22px' }}>+ Log Today</button>
      </div>

      {loading ? <Skeletons n={2} h={140} /> : byDate.length === 0 ? (
        <Empty icon={config.icon} title={config.emptyTitle} desc={config.emptyDesc} onAdd={() => openAdd(localDate())} label={config.emptyLabel} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {byDate.map(([day, dayEntries]) => {
            const total = dayEntries.reduce((s, e) => s + +e.hours, 0);
            return (
              <div key={day} className="card" style={{ borderLeft: `4px solid ${color}` }}>
                {/* Day header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{dayLabel(day)}</div>
                    <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', marginTop: 2 }}>{config.dayTotal(total)}</div>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => openAdd(day)} style={{ borderRadius: 20, fontSize: 11 }}>+ Add more</button>
                </div>

                {/* Stacked bar */}
                <HoursBar entries={dayEntries} colorMap={colorMap} keyField={keyField} palette={palette} />

                {/* Entry rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {dayEntries.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(13,13,13,0.02)', border: '1px solid rgba(13,13,13,0.04)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor(e[keyField], colorMap, palette), flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{e[keyField]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{+e.hours}h</span>
                      {e.notes && <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes}</span>}
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(e)} style={{ padding: '3px 6px', fontSize: 11 }}>✎</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(e)} style={{ padding: '3px 6px', fontSize: 11, color: 'rgba(13,13,13,0.2)' }}>🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (<div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}><div className="modal modal-lg">
        <div className="modal-header">
          <h3>{editEntry ? 'Edit Entry' : `${config.logLabel} — ${dateLabel(date)}`}</h3>
          <button className="modal-close" onClick={() => setModal(false)}>✕</button>
        </div>
        {!editEntry && (
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
        )}
        {editEntry ? (
          <>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">{config.keyLabel}</label><input maxLength={200} className="form-input" value={editForm[keyField]} onChange={e => setEditForm({ ...editForm, [keyField]: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Hours</label><input type="number" className="form-input" value={editForm.hours} onChange={e => setEditForm({ ...editForm, hours: e.target.value })} min="0.1" max="24" step="0.25" /></div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notes (optional)</label><input maxLength={200} className="form-input" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Any detail?" /></div>
          </>
        ) : (
          <>
            <label className="form-label" style={{ marginBottom: 10 }}>{config.rowsLabel} <span style={{ color: 'rgba(13,13,13,0.4)', fontWeight: 400, fontSize: 12 }}>— add as many as needed</span></label>
            {config.quickPicks.length > 0 && (
              <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {config.quickPicks.map(cat => (
                  <button key={cat} onClick={() => setRows([...rows, { [keyField]: cat, hours: '' }])}
                    style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--mist)', border: '1px solid rgba(13,13,13,0.08)', fontSize: 12, cursor: 'pointer', fontWeight: 600, color }}>
                    + {cat}
                  </button>
                ))}
              </div>
            )}
            <MultiRowEditor rows={rows} setRows={setRows} keyLabel={keyField} keyPlaceholder={config.keyPlaceholder} color={color} />
          </>
        )}
        <div className="stack-on-mobile modal-footer" style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-outline" onClick={() => setModal(false)} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : editEntry ? 'Save Changes' : config.logLabel}</button>
        </div>
      </div></div>)}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
