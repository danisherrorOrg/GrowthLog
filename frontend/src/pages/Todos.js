import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

// ── Priority config ─────────────────────────────────────────────────────────
const PRIORITY = {
  high:   { color: 'var(--rust)',  label: '🔴 High',   bg: 'rgba(196,98,58,0.06)'  },
  medium: { color: 'var(--gold)',  label: '🟡 Medium', bg: 'rgba(201,168,76,0.06)' },
  low:    { color: 'var(--sage)',  label: '🟢 Low',    bg: 'rgba(107,140,107,0.06)'},
};

// ── Time helpers ────────────────────────────────────────────────────────────
function fmtMinutes(min) {
  if (!min && min !== 0) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function TimeAccuracy({ estimated, actual }) {
  if (!estimated || !actual) return null;
  const ratio = actual / estimated;
  let label, color, bg;
  if (ratio <= 0.9)       { label = '🚀 Faster than expected'; color = '#2a7a2a'; bg = 'rgba(42,122,42,0.08)'; }
  else if (ratio <= 1.1)  { label = '🎯 Right on time';       color = 'var(--sage)'; bg = 'rgba(107,140,107,0.1)'; }
  else if (ratio <= 1.5)  { label = '⏱ Slightly over';       color = '#a07a10'; bg = 'rgba(201,168,76,0.1)'; }
  else                    { label = '⚠️ Significantly over';  color = 'var(--rust)'; bg = 'rgba(196,98,58,0.08)'; }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: bg, color,
    }}>
      {label} ({Math.round(ratio * 100)}%)
    </div>
  );
}

// ── Time estimate input ─────────────────────────────────────────────────────
function TimeEstimateInput({ value, onChange, label = 'Estimated Time', compact = false }) {
  const PRESETS = [15, 30, 60, 90, 120];
  const [custom, setCustom] = useState((value && !PRESETS.includes(value)) ? String(value) : '');
  const [useCustom, setUseCustom] = useState(value && !PRESETS.includes(value));

  return (
    <div>
      <label className="form-label" style={{ fontSize: 10 }}>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {PRESETS.map(p => (
          <button key={p} type="button"
            onClick={() => { setUseCustom(false); onChange(p); }}
            className={`btn btn-sm ${!useCustom && value === p ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}>
            {fmtMinutes(p)}
          </button>
        ))}
        <button type="button"
          onClick={() => { setUseCustom(true); onChange(custom ? parseInt(custom) : null); }}
          className={`btn btn-sm ${useCustom ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: 11, padding: '4px 10px' }}>
          Custom
        </button>
        {useCustom && (
          <input maxLength={200} type="number" className="form-input" value={custom}
            onChange={e => { setCustom(e.target.value); onChange(e.target.value ? parseInt(e.target.value) : null); }}
            placeholder="mins" min={1} max={9999}
            className="form-input input-sm" style={{ fontSize: 12, padding: '4px 8px' }} />
        )}
        {value && (
          <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', fontStyle: 'italic' }}>
            = {fmtMinutes(value)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Due-date badge helper ───────────────────────────────────────────────────
function DueBadge({ dateStr, isDone }) {
  if (!dateStr) return null;
  let date;
  try { date = parseISO(dateStr); } catch { return null; }

  const overdue  = !isDone && isPast(date) && !isToday(date);
  const dueToday = !isDone && isToday(date);
  const dueTmrw  = !isDone && isTomorrow(date);
  const daysLeft = differenceInDays(date, new Date());

  let label, bg, color;
  if (overdue)       { label = `${Math.abs(daysLeft)}d overdue`; bg = 'rgba(196,98,58,0.12)'; color = 'var(--rust)'; }
  else if (dueToday) { label = 'Due today';    bg = 'rgba(201,168,76,0.15)'; color = '#a07a10'; }
  else if (dueTmrw)  { label = 'Due tomorrow'; bg = 'rgba(201,168,76,0.08)'; color = '#a07a10'; }
  else if (isDone)   { label = format(date, 'MMM d'); bg = 'rgba(13,13,13,0.04)'; color = 'rgba(13,13,13,0.3)'; }
  else               { label = format(date, 'MMM d'); bg = 'rgba(13,13,13,0.04)'; color = 'rgba(13,13,13,0.4)'; }

  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, textTransform: 'uppercase', letterSpacing: 0.5,
      display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      📅 {label}
    </span>
  );
}

// ── Skeleton loader ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 6 }} />
    </div>
  );
}

// ── Confirm modal ───────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--rust)' }}>{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', lineHeight: 1.6, marginBottom: 24 }}>{body}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn" onClick={onConfirm}
            style={{ flex: 1, background: 'var(--rust)', color: 'white', border: 'none' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Complete-with-time modal ────────────────────────────────────────────────
function CompleteModal({ todo, onConfirm, onCancel }) {
  const [actualMinutes, setActualMinutes] = useState(todo.estimated_minutes || null);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3>✓ Complete Task</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div style={{ padding: '4px 0 20px' }}>
          <div style={{
            fontSize: 14, fontFamily: 'Fraunces', color: 'var(--ink)',
            padding: '12px 16px', background: 'var(--mist)', borderRadius: 10, marginBottom: 20,
            fontStyle: 'italic',
          }}>
            "{todo.title}"
          </div>

          {todo.estimated_minutes && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
              padding: '8px 14px', background: 'rgba(107,140,107,0.06)', borderRadius: 8,
              fontSize: 13, color: 'rgba(13,13,13,0.6)',
            }}>
              <span>⏱</span>
              <span>Estimated: <strong>{fmtMinutes(todo.estimated_minutes)}</strong></span>
            </div>
          )}

          <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
            color: 'rgba(13,13,13,0.4)', fontWeight: 700, display: 'block', marginBottom: 10 }}>
            How long did it actually take?
          </label>

          <TimeEstimateInput
            value={actualMinutes}
            onChange={v => setActualMinutes(v)}
            label=""
          />

          {todo.estimated_minutes && actualMinutes && (
            <div style={{ marginTop: 14 }}>
              <TimeAccuracy estimated={todo.estimated_minutes} actual={actualMinutes} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(actualMinutes)} style={{ flex: 1 }}>
            Mark as Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview modal ───────────────────────────────────────────────────────────
function TodoPreviewModal({ todo, onClose, onComplete, onReopen, onDelete, onEdit }) {
  const isDone = todo.status === 'done';
  const p = PRIORITY[todo.priority] || PRIORITY.medium;

  const handleDelete = () => { onClose(); onDelete(); };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}>

        {/* Coloured header */}
        <div style={{
          background: p.bg,
          borderBottom: `3px solid ${p.color}`,
          padding: '20px 24px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{
              fontSize: 20, fontFamily: 'Fraunces', fontWeight: 600, lineHeight: 1.4,
              color: isDone ? 'rgba(13,13,13,0.55)' : 'var(--ink)',
              textDecoration: isDone ? 'line-through' : 'none',
              margin: 0, flex: 1, paddingRight: 12,
            }}>{todo.title}</h3>
            <button className="modal-close" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
          </div>

          {/* Meta badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: p.color,
              color: 'white',
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              {todo.priority} priority
            </span>
            <DueBadge dateStr={todo.due_date} isDone={isDone} />
            {isDone && todo.completed_at && (
              <span style={{
                fontSize: 10, color: 'rgba(13,13,13,0.35)', letterSpacing: 0.3,
                padding: '3px 10px', borderRadius: 20, background: 'rgba(13,13,13,0.05)',
              }}>
                ✓ {format(parseISO(todo.completed_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Description */}
          {todo.description?.trim() ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
                color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 8 }}>Description</div>
              <div className="markdown-body" style={{
                fontSize: 15, lineHeight: 1.75, color: 'rgba(13,13,13,0.75)',
                padding: '14px 18px', background: 'var(--mist)', borderRadius: 10,
              }}>
                <MarkdownRenderer content={todo.description} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.25)', fontStyle: 'italic',
              textAlign: 'center', padding: '8px 0 16px' }}>
              No description added.
            </div>
          )}

          {/* Time tracking block */}
          <div style={{
            background: 'white', border: '1px solid rgba(13,13,13,0.07)',
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
              color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 12 }}>
              ⏱ Time Tracking
            </div>
            <div className="stack-grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Estimated</div>
                <div style={{ fontSize: 22, fontFamily: 'Fraunces', color: 'var(--sage)' }}>
                  {fmtMinutes(todo.estimated_minutes) || <span style={{ fontSize: 14, opacity: 0.3 }}>—</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(13,13,13,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Actual</div>
                <div style={{ fontSize: 22, fontFamily: 'Fraunces', color: todo.actual_minutes ? 'var(--ink)' : 'rgba(13,13,13,0.2)' }}>
                  {fmtMinutes(todo.actual_minutes) || <span style={{ fontSize: 14, opacity: 0.3 }}>—</span>}
                </div>
              </div>
            </div>
            {todo.estimated_minutes && todo.actual_minutes && (
              <TimeAccuracy estimated={todo.estimated_minutes} actual={todo.actual_minutes} />
            )}
            {!todo.estimated_minutes && !todo.actual_minutes && (
              <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.25)', fontStyle: 'italic' }}>
                No time tracked. Set an estimate when creating tasks.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="todo-preview-footer" style={{
          display: 'flex', gap: 10, padding: '0 24px 20px',
          borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 16,
        }}>
          <button className="btn btn-outline" onClick={onEdit} style={{ flex: 1 }}>✎ Edit</button>
          <button className="btn" onClick={handleDelete}
            style={{ flex: 1, background: 'rgba(196,98,58,0.08)', color: 'var(--rust)', border: '1px solid rgba(196,98,58,0.2)' }}>
            ✕ Delete
          </button>
          {isDone ? (
            <button className="btn btn-primary" onClick={() => { onReopen(); onClose(); }} style={{ flex: 1 }}>
              ↩ Reopen
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => { onComplete(); onClose(); }} style={{ flex: 1 }}>
              ✓ Mark Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Todos() {
  const [todos, setTodos]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [newTodo, setNewTodo]         = useState({ title: '', description: '', priority: 'medium', due_date: '', estimated_minutes: null });
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null); // for complete-with-time modal
  const addTitleRef = useRef(null);

  const fetchTodos = async () => {
    try {
      const res = await API.get('/todos');
      setTodos(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, []);
  useEffect(() => { if (showAdd && addTitleRef.current) addTitleRef.current.focus(); }, [showAdd]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;
    try {
      const res = await API.post('/todos', newTodo);
      setTodos([res.data, ...todos]);
      setNewTodo({ title: '', description: '', priority: 'medium', due_date: '', estimated_minutes: null });
      setShowAdd(false);
      toast.success('✦ Task added');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add task'));
    }
  };

  // Called from the CompleteModal with actual_minutes value
  const handleComplete = async (id, actualMinutes) => {
    try {
      const res = await API.patch(`/todos/${id}/complete`, { actual_minutes: actualMinutes || null });
      setTodos(todos.map(t => t.id === id ? res.data : t));
      setCompleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete task'));
    }
  };

  const handleReopen = async (id) => {
    try {
      const res = await API.put(`/todos/${id}`, { status: 'pending' });
      setTodos(todos.map(t => t.id === id ? res.data : t));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reopen task'));
    }
  };

  const confirmDelete = (id) => setDeleteTarget(id);
  const doDelete = async () => {
    try {
      await API.delete(`/todos/${deleteTarget}`);
      setTodos(todos.filter(t => t.id !== deleteTarget));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = async (id, updatedData) => {
    try {
      const res = await API.put(`/todos/${id}`, updatedData);
      setTodos(todos.map(t => t.id === id ? res.data : t));
      toast.success('Task updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task'));
    }
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const applyFilter = (t) => {
    if (filter === 'active')    return t.status === 'pending';
    if (filter === 'completed') return t.status === 'done';
    if (filter === 'high')      return t.status === 'pending' && t.priority === 'high';
    if (filter === 'overdue')   return t.status === 'pending' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
    return true;
  };

  const applySearch = (t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
  };

  const visible  = todos.filter(t => applyFilter(t) && applySearch(t));
  const pending  = visible.filter(t => t.status === 'pending');
  const done     = visible.filter(t => t.status === 'done');
  const overdueCount = todos.filter(t =>
    t.status === 'pending' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  ).length;

  return (
    <div>
      <div className="page-header">
        <h2>Action Board 🎯</h2>
        <p>Capture intentions. Ship them. Reflect on the effort.</p>
      </div>

      <div className="page-body">
        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="card" style={{
            marginBottom: 24, padding: '14px 20px',
            background: 'rgba(196,98,58,0.04)', border: '1px solid rgba(196,98,58,0.15)',
          }}>
            <div className="alert-banner-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 14, color: 'var(--rust)', marginBottom: 2 }}>
                  ⚠️ {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
                </h3>
                <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>These tasks have passed their due date.</p>
              </div>
              <button className="btn btn-sm btn-outline"
                style={{ color: 'var(--rust)', borderColor: 'rgba(196,98,58,0.3)' }}
                onClick={() => setFilter('overdue')}>
                View Overdue →
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="card toolbar-card" style={{
          marginBottom: 32, padding: '12px 20px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div className="toolbar-left" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-pills" style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
              {[
                { key: 'all',       label: 'All' },
                { key: 'active',    label: 'Active' },
                { key: 'high',      label: '🔴 High' },
                { key: 'overdue',   label: '⚠️ Overdue' },
                { key: 'completed', label: 'Done' },
              ].map(f => (
                <button key={f.key}
                  className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(f.key)}
                  style={{ borderRadius: 8, padding: '6px 14px', fontSize: 11 }}>
                  {f.label}
                  {f.key === 'all' && ` (${todos.length})`}
                  {f.key === 'overdue' && overdueCount > 0 && (
                    <span style={{
                      marginLeft: 4, background: 'var(--rust)', color: 'white',
                      borderRadius: '50%', width: 16, height: 16, fontSize: 9,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{overdueCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input maxLength={200} className="form-input full-width-mobile" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..."
                style={{ padding: '7px 12px 7px 32px', fontSize: 12, height: 'auto', minWidth: 180 }} />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.35 }}>🔍</span>
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4,
                }}>✕</button>
              )}
            </div>
          </div>

          <button className="btn btn-primary toolbar-primary-btn" onClick={() => setShowAdd(s => !s)}
            style={{ borderRadius: 30, padding: '10px 24px' }}>
            {showAdd ? '✕ Close' : '+ New Task'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 32, border: '2px solid var(--sage)', background: 'rgba(107,140,107,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>New Task</h3>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                ref={addTitleRef}
                type="text"
                className="form-input"
                placeholder="What needs to be done?"
                value={newTodo.title}
                onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
                style={{ fontSize: 17, border: 'none', background: 'transparent', padding: 0,
                  borderBottom: '1px solid rgba(13,13,13,0.12)', borderRadius: 0, fontWeight: 500 }}
              />
              <textarea
                className="form-textarea"
                placeholder="Add a description (optional, markdown supported)..."
                value={newTodo.description}
                onChange={e => setNewTodo({ ...newTodo, description: e.target.value })}
                style={{ minHeight: 60, fontSize: 13 }}
              />
              <div className="todo-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Priority</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(PRIORITY).map(([key, pr]) => (
                      <button key={key} type="button"
                        onClick={() => setNewTodo({ ...newTodo, priority: key })}
                        className={`btn btn-sm ${newTodo.priority === key ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 11 }}>
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Due Date (optional)</label>
                  <input maxLength={200} type="date" className="form-input" value={newTodo.due_date}
                    onChange={e => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ fontSize: 13 }} />
                </div>
              </div>

              {/* Time estimate */}
              <TimeEstimateInput
                value={newTodo.estimated_minutes}
                onChange={v => setNewTodo({ ...newTodo, estimated_minutes: v })}
                label="Estimated Time (optional)"
              />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px' }}>
                  Capture Task ✦
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban columns */}
        {loading ? (
          <div className="grid-2" style={{ gap: 40 }}>
            {[0, 1].map(col => (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="skeleton" style={{ height: 18, width: 160, borderRadius: 6 }} />
                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 40 }}>
            {/* Pending column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'var(--sage)', fontWeight: 700, margin: 0 }}>Upcoming Focus</h3>
                <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.35)' }}>
                  {pending.length} task{pending.length !== 1 ? 's' : ''}
                </span>
              </div>
              {pending.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 24px', borderStyle: 'dashed' }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>✨</div>
                  <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.4)' }}>
                    {search ? 'No tasks match your search.' : 'All clear. Add a new task above.'}
                  </div>
                </div>
              ) : (
                pending.map(t => (
                  <TodoCard key={t.id} todo={t}
                    onComplete={() => setCompleteTarget(t)}
                    onReopen={() => handleReopen(t.id)}
                    onDelete={() => confirmDelete(t.id)}
                    onSave={handleEdit} />
                ))
              )}
            </div>

            {/* Done column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'rgba(13,13,13,0.35)', fontWeight: 700, margin: 0 }}>Completed</h3>
                <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.25)' }}>
                  {done.length} task{done.length !== 1 ? 's' : ''}
                </span>
              </div>
              {done.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12,
                  color: 'rgba(13,13,13,0.2)', fontStyle: 'italic' }}>
                  No completed tasks in current view.
                </div>
              ) : (
                <div style={{ opacity: 0.75, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {done.map(t => (
                    <TodoCard key={t.id} todo={t}
                      onComplete={() => setCompleteTarget(t)}
                      onReopen={() => handleReopen(t.id)}
                      onDelete={() => confirmDelete(t.id)}
                      onSave={handleEdit} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Task?"
          body="This will permanently remove the task. This action cannot be undone."
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {completeTarget && (
        <CompleteModal
          todo={completeTarget}
          onConfirm={(actualMinutes) => handleComplete(completeTarget.id, actualMinutes)}
          onCancel={() => setCompleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── TodoCard ────────────────────────────────────────────────────────────────
function TodoCard({ todo, onComplete, onReopen, onDelete, onSave }) {
  const [isEditing, setIsEditing]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editForm, setEditForm]       = useState({
    title: todo.title,
    description: todo.description || '',
    priority: todo.priority,
    due_date: todo.due_date || '',
    estimated_minutes: todo.estimated_minutes || null,
  });

  const isDone = todo.status === 'done';
  const p = PRIORITY[todo.priority] || PRIORITY.medium;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    onSave(todo.id, editForm);
    setIsEditing(false);
  };

  // ── Edit mode ──
  if (isEditing) {
    return (
      <div className="card card-sm" style={{ border: `2px solid var(--sage)`, marginBottom: 8 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input maxLength={200} type="text" className="form-input"
            value={editForm.title}
            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
            autoFocus style={{ fontSize: 15, fontWeight: 500 }} />
          <textarea maxLength={2000} className="form-textarea"
            value={editForm.description}
            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="Description (optional)..."
            style={{ minHeight: 52, fontSize: 13 }} />
          <div className="todo-edit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label" style={{ fontSize: 10 }}>Priority</label>
              <select className="form-select" value={editForm.priority}
                onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                style={{ fontSize: 12 }}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 10 }}>Due Date</label>
              <input maxLength={200} type="date" className="form-input" value={editForm.due_date}
                onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                style={{ fontSize: 12 }} />
            </div>
          </div>
          <TimeEstimateInput
            value={editForm.estimated_minutes}
            onChange={v => setEditForm({ ...editForm, estimated_minutes: v })}
            label="Estimated Time"
          />
          {/* Actual time for done tasks inline edit */}
          {isDone && (
            <TimeEstimateInput
              value={todo.actual_minutes}
              onChange={v => onSave(todo.id, { actual_minutes: v })}
              label="Actual Time Taken"
            />
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => { setIsEditing(false); setEditForm({ title: todo.title, description: todo.description || '', priority: todo.priority, due_date: todo.due_date || '', estimated_minutes: todo.estimated_minutes || null }); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
          </div>
        </form>
      </div>
    );
  }

  // ── View mode ──
  return (
    <>
      {showPreview && (
        <TodoPreviewModal
          todo={todo}
          onClose={() => setShowPreview(false)}
          onComplete={onComplete}
          onReopen={onReopen}
          onDelete={onDelete}
          onEdit={() => { setShowPreview(false); setIsEditing(true); }}
        />
      )}
      <div className="card card-sm" style={{
        borderLeft: `4px solid ${p.color}`,
        background: isDone ? 'var(--mist)' : 'white',
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
        marginBottom: 0,
      }}
        onClick={() => setShowPreview(true)}
        onMouseEnter={e => { if (!isDone) e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,13,13,0.08)'; }}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,13,13,0.04)'}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Checkbox */}
          <input type="checkbox" checked={isDone}
            onChange={e => { e.stopPropagation(); isDone ? onReopen() : onComplete(); }}
            onClick={e => e.stopPropagation()}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: p.color, marginTop: 2, flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <div style={{
              fontSize: 15, fontWeight: 500,
              textDecoration: isDone ? 'line-through' : 'none',
              color: isDone ? 'rgba(13,13,13,0.4)' : 'var(--ink)',
              lineHeight: 1.4, wordBreak: 'break-word',
            }}>
              <MarkdownRenderer content={todo.title} />
            </div>

            {/* Description preview */}
            {todo.description?.trim() && (
              <div style={{
                fontSize: 12, color: 'rgba(13,13,13,0.5)', lineHeight: 1.5, marginTop: 4,
                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {todo.description}
              </div>
            )}

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: p.bg, color: p.color, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {todo.priority}
              </span>
              <DueBadge dateStr={todo.due_date} isDone={isDone} />

              {/* Time estimate badge on card */}
              {todo.estimated_minutes && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(13,13,13,0.04)', color: 'rgba(13,13,13,0.5)',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  ⏱ {fmtMinutes(todo.estimated_minutes)}
                  {todo.actual_minutes && ` → ${fmtMinutes(todo.actual_minutes)}`}
                </span>
              )}

              {isDone && todo.completed_at && (
                <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)' }}>
                  ✓ {format(parseISO(todo.completed_at), 'MMM d')}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button className="btn btn-ghost"
              onClick={e => { e.stopPropagation(); setIsEditing(true); }}
              style={{ color: 'rgba(13,13,13,0.3)', padding: 6, fontSize: 13 }}>✎</button>
            <button className="btn btn-ghost"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ color: 'rgba(196,98,58,0.5)', padding: 6, fontSize: 13 }}>✕</button>
          </div>
        </div>
      </div>
    </>
  );
}
