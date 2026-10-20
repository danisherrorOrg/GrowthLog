import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import API from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import { localDate } from '../../utils/dates';

export { localDate };

// ── palette for categories ──────────────────────────────────────────────────
export const PALETTE = ['#6b8c6b', '#5b8ba8', '#c9a84c', '#8b6bc4', '#c4623a', '#5b9e8f', '#c46b8b', '#7a8fa6', '#a89b6b'];
export const catColor = (name, pool, palette) => {
  const currentPalette = palette || PALETTE;
  if (!pool[name]) pool[name] = currentPalette[Object.keys(pool).length % currentPalette.length];
  return pool[name];
};

export const onHover = (color) => (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}`; };
export const offHover = () => (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; };
export const Skeletons = ({ n = 3, h = 80 }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 14 }} />)}</div>);
export const Empty = ({ icon, title, desc, onAdd, label }) => (<div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button className="btn btn-primary" onClick={onAdd} style={{ borderRadius: 30 }}>{label}</button></div>);

export const dateLabel = (d) => { try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d || '—'; } };
export const dayLabel = (d) => { try { return format(parseISO(d), 'EEEE, MMM d'); } catch { return d || '—'; } };

// ── 24h breakdown bar ────────────────────────────────────────────────────────
export function HoursBar({ entries, colorMap, keyField = 'category', palette }) {
  const total = entries.reduce((s, e) => s + +e.hours, 0);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'rgba(13,13,13,0.5)' }}>
        <span>{total.toFixed(1)}h logged</span>
        <span style={{ color: total > 20 ? 'var(--rust)' : 'rgba(13,13,13,0.4)' }}>{(24 - total).toFixed(1)}h untracked</span>
      </div>
      {/* segmented bar */}
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(13,13,13,0.06)', overflow: 'hidden', display: 'flex' }}>
        {entries.map((e, i) => (
          <div key={i} title={`${e[keyField]}: ${e.hours}h`} style={{ width: `${(+e.hours / 24) * 100}%`, background: catColor(e[keyField], colorMap, palette), transition: 'width 0.4s' }} />
        ))}
      </div>
      {/* legend chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {entries.map((e, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: catColor(e[keyField], colorMap, palette) + '22', color: catColor(e[keyField], colorMap, palette), fontWeight: 700, border: `1px solid ${catColor(e[keyField], colorMap, palette)}44` }}>
            {e[keyField]} · {e.hours}h
          </span>
        ))}
      </div>
    </div>
  );
}

// ── multi-row entry editor ───────────────────────────────────────────────────
export function MultiRowEditor({ rows, setRows, keyLabel, keyPlaceholder, color }) {
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
            <input className="form-input hours-input" type="number" style={{ width: 90, flexShrink: 0 }} value={row.hours}
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

// ── Rating bar helper ──────────────────────────────────────────────────
export const RatingBar = ({ value, color }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i < value ? color : 'rgba(13,13,13,0.08)' }} />
    ))}
  </div>
);

// ── Preview modal ──────────────────────────────────────────────────────
export const PreviewModal = ({ item, onClose, icon, iconBg, titleColor, title, subtitle, body }) => item && (
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

// Shared state for an Insight Lab list: loading, the add/edit modal, the preview and deletes.
// `endpoint` is the collection URL, e.g. '/insights/anti-goals'.
export function useInsightList(endpoint, emptyForm) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  // emptyForm may be a function so date fields default to the day the form is opened
  const freshForm = () => (typeof emptyForm === 'function' ? emptyForm() : emptyForm);
  const [form, setForm] = useState(freshForm);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get(endpoint); setItems(r.data); }
    catch (e) { toast.error(getErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { reload(); }, [reload]);

  const openCreate = () => { setEditing(null); setForm(freshForm()); setModal(true); };
  const openEdit = (item, itemForm) => { setEditing(item); setForm(itemForm); setModal(true); };
  const closeModal = () => setModal(false);

  // Creates or updates `form`; `createdMessage` is the toast shown for a new item
  const save = async (createdMessage) => {
    setSaving(true);
    try {
      editing ? await API.put(`${endpoint}/${editing.id}`, form) : await API.post(endpoint, form);
      toast.success(editing ? 'Updated' : createdMessage); setModal(false); reload();
    } catch (e) { toast.error(getErrorMessage(e, 'Failed')); } finally { setSaving(false); }
  };

  const remove = (item, { title, message, done = 'Deleted' }) => setConfirm({
    title, message, confirmLabel: 'Delete', danger: true,
    onConfirm: async () => {
      try { await API.delete(`${endpoint}/${item.id}`); toast.success(done); reload(); }
      catch (e) { toast.error(getErrorMessage(e, 'Failed to delete')); }
    }
  });

  return {
    items, loading, reload, form, setForm, editing, modal, openCreate, openEdit, closeModal,
    save, saving, remove, preview, setPreview, confirm, setConfirm,
  };
}
