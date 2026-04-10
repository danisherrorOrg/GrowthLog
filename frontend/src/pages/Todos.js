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
  if (overdue)  { label = `${Math.abs(daysLeft)}d overdue`; bg = 'rgba(196,98,58,0.12)'; color = 'var(--rust)'; }
  else if (dueToday) { label = 'Due today';   bg = 'rgba(201,168,76,0.15)'; color = '#a07a10'; }
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

// ── Skeleton loader ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 6 }} />
    </div>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────
function TodoPreviewModal({ todo, onClose, onToggle, onDelete, onEdit }) {
  const isDone = todo.status === 'done';
  const p = PRIORITY[todo.priority] || PRIORITY.medium;

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}>

        {/* Coloured header bar */}
        <div style={{
          background: isDone ? 'var(--mist)' : p.bg,
          borderBottom: `3px solid ${p.color}`,
          padding: '20px 24px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => { onToggle(); onClose(); }}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: p.color, marginTop: 3, flexShrink: 0 }}
              />
              <h3 style={{
                fontSize: 20, fontFamily: 'Fraunces', fontWeight: 600, lineHeight: 1.4,
                color: isDone ? 'rgba(13,13,13,0.4)' : 'var(--ink)',
                textDecoration: isDone ? 'line-through' : 'none',
                margin: 0,
              }}>{todo.title}</h3>
            </div>
            <button className="modal-close" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', paddingLeft: 28 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: isDone ? 'rgba(13,13,13,0.06)' : p.color, color: isDone ? 'rgba(13,13,13,0.4)' : 'white',
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              {todo.priority} priority
            </span>
            <DueBadge dateStr={todo.due_date} isDone={isDone} />
            {isDone && todo.completed_at && (
              <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.35)', letterSpacing: 0.3,
                padding: '3px 10px', borderRadius: 20, background: 'rgba(13,13,13,0.05)' }}>
                ✓ Completed {format(parseISO(todo.completed_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {todo.description?.trim() ? (
            <>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
                color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 10 }}>Description</div>
              <div className="markdown-body" style={{
                fontSize: 15, lineHeight: 1.75, color: 'rgba(13,13,13,0.75)',
                padding: '16px 20px', background: 'var(--mist)', borderRadius: 12,
              }}>
                <MarkdownRenderer content={todo.description} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'rgba(13,13,13,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              No description added.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          display: 'flex', gap: 10, padding: '0 24px 20px',
          borderTop: '1px solid rgba(13,13,13,0.05)', paddingTop: 16,
        }}>
          <button className="btn btn-outline" onClick={onEdit} style={{ flex: 1 }}>
            ✎ Edit Task
          </button>
          <button className="btn" onClick={handleDelete}
            style={{ flex: 1, background: 'rgba(196,98,58,0.08)', color: 'var(--rust)', border: '1px solid rgba(196,98,58,0.2)' }}>
            ✕ Delete
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { onToggle(); onClose(); }}
            style={{ flex: 1 }}>
            {isDone ? '↩ Reopen' : '✓ Mark Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────
export default function Todos() {
  const [todos, setTodos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [newTodo, setNewTodo]   = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // styled confirm modal
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

  // Focus add-input when form opens
  useEffect(() => {
    if (showAdd && addTitleRef.current) addTitleRef.current.focus();
  }, [showAdd]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;
    try {
      const res = await API.post('/todos', newTodo);
      setTodos([res.data, ...todos]);
      setNewTodo({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowAdd(false);
      toast.success('✦ Task added');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add task'));
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    const isDone   = currentStatus === 'done';
    const newStatus = isDone ? 'pending' : 'done';
    try {
      const res = isDone
        ? await API.put(`/todos/${id}`, { status: 'pending' })
        : await API.patch(`/todos/${id}/complete`);
      setTodos(todos.map(t => t.id === id ? res.data : t));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
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
    if (filter === 'active')   return t.status === 'pending';
    if (filter === 'completed') return t.status === 'done';
    if (filter === 'high')     return t.status === 'pending' && t.priority === 'high';
    if (filter === 'overdue')  return t.status === 'pending' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
    return true; // 'all'
  };

  const applySearch = (t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  };

  const visible  = todos.filter(t => applyFilter(t) && applySearch(t));
  const pending  = visible.filter(t => t.status === 'pending');
  const done     = visible.filter(t => t.status === 'done');
  const overdueCount = todos.filter(t =>
    t.status === 'pending' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  ).length;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Action Board 🎯</h2>
        <p>Capture intentions. Ship them. Rest.</p>
      </div>

      <div className="page-body">

        {/* ── Overdue alert ── */}
        {overdueCount > 0 && (
          <div className="card" style={{
            marginBottom: 24, padding: '14px 20px',
            background: 'rgba(196,98,58,0.04)', border: '1px solid rgba(196,98,58,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: 14, color: 'var(--rust)', marginBottom: 2 }}>
                ⚠️ {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
              </h3>
              <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>
                These tasks have passed their due date.
              </p>
            </div>
            <button className="btn btn-sm btn-outline" style={{ color: 'var(--rust)', borderColor: 'rgba(196,98,58,0.3)' }}
              onClick={() => setFilter('overdue')}>
              View Overdue →
            </button>
          </div>
        )}

        {/* ── Unified toolbar ── */}
        <div className="card" style={{
          marginBottom: 32, padding: '12px 20px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
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
                    <span style={{ marginLeft: 4, background: 'var(--rust)', color: 'white',
                      borderRadius: '50%', width: 16, height: 16, fontSize: 9,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {overdueCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..."
                style={{ padding: '7px 12px 7px 32px', fontSize: 12, height: 'auto', minWidth: 180 }}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, opacity: 0.35 }}>🔍</span>
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4
                }}>✕</button>
              )}
            </div>
          </div>

          <button className="btn btn-primary"
            onClick={() => setShowAdd(s => !s)}
            style={{ borderRadius: 30, padding: '10px 24px' }}>
            {showAdd ? '✕ Close' : '+ New Task'}
          </button>
        </div>

        {/* ── Add task form ── */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Priority</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(PRIORITY).map(([key, p]) => (
                      <button key={key} type="button"
                        onClick={() => setNewTodo({ ...newTodo, priority: key })}
                        className={`btn btn-sm ${newTodo.priority === key ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 11, borderColor: newTodo.priority === key ? undefined : p.color,
                          color: newTodo.priority === key ? undefined : p.color }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Due Date (optional)</label>
                  <input type="date" className="form-input"
                    value={newTodo.due_date}
                    onChange={e => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px' }}>
                  Capture Task ✦
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Two-column Kanban ── */}
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
            {/* ── Pending column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'var(--sage)', fontWeight: 700, margin: 0 }}>
                  Upcoming Focus
                </h3>
                <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.35)', fontWeight: 500 }}>
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
                    onToggle={() => toggleComplete(t.id, t.status)}
                    onDelete={() => confirmDelete(t.id)}
                    onSave={handleEdit} />
                ))
              )}
            </div>

            {/* ── Done column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'rgba(13,13,13,0.35)', fontWeight: 700, margin: 0 }}>
                  Completed
                </h3>
                <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.25)', fontWeight: 500 }}>
                  {done.length} task{done.length !== 1 ? 's' : ''}
                </span>
              </div>

              {done.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12,
                  color: 'rgba(13,13,13,0.2)', fontStyle: 'italic' }}>
                  No completed tasks in current view.
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>
                  {done.map(t => (
                    <TodoCard key={t.id} todo={t}
                      onToggle={() => toggleComplete(t.id, t.status)}
                      onDelete={() => confirmDelete(t.id)}
                      onSave={handleEdit} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Styled confirm modal ── */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Task?"
          body="This will permanently remove the task. This action cannot be undone."
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── TodoCard ──────────────────────────────────────────────────────────────
function TodoCard({ todo, onToggle, onDelete, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editForm, setEditForm]   = useState({
    title: todo.title,
    description: todo.description || '',
    priority: todo.priority,
    due_date: todo.due_date || '',
  });
  const [expanded, setExpanded]   = useState(false);

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
      <div className="card card-sm" style={{ border: `2px solid var(--sage)` }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            className="form-input"
            value={editForm.title}
            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
            autoFocus
            style={{ fontSize: 15, fontWeight: 500 }}
          />
          <textarea
            className="form-textarea"
            value={editForm.description}
            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="Description (optional)..."
            style={{ minHeight: 52, fontSize: 13 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
              <input type="date" className="form-input" value={editForm.due_date}
                onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                style={{ fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => { setIsEditing(false); setEditForm({ title: todo.title, description: todo.description || '', priority: todo.priority, due_date: todo.due_date || '' }); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
          </div>
        </form>
      </div>
    );
  }

  // ── View mode ──
  const hasDescription = !!todo.description?.trim();
  const descPreviewLength = 100;
  const descLong = hasDescription && todo.description.length > descPreviewLength;

  return (
    <>
    {showPreview && (
      <TodoPreviewModal
        todo={todo}
        onClose={() => setShowPreview(false)}
        onToggle={onToggle}
        onDelete={onDelete}
        onEdit={() => { setShowPreview(false); setIsEditing(true); }}
      />
    )}
    <div className="card card-sm" style={{
      borderLeft: `4px solid ${p.color}`,
      background: isDone ? 'var(--mist)' : 'white',
      transition: 'box-shadow 0.2s',
      cursor: 'pointer',
    }}
      onClick={() => setShowPreview(true)}
      onMouseEnter={e => { if (!isDone) e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,13,13,0.08)'; }}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,13,13,0.04)'}
    >
      {/* Row 1: checkbox + title + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <input
          type="checkbox"
          checked={isDone}
          onChange={e => { e.stopPropagation(); onToggle(); }}
          onClick={e => e.stopPropagation()}
          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: p.color, marginTop: 2, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 500,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'rgba(13,13,13,0.4)' : 'var(--ink)',
            lineHeight: 1.4, wordBreak: 'break-word',
          }}>
            <MarkdownRenderer content={todo.title} />
          </div>

          {/* Description preview */}
          {hasDescription && (
            <div style={{ marginTop: 6 }}>
              <div style={{
                fontSize: 13, color: 'rgba(13,13,13,0.55)', lineHeight: 1.6,
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? 'unset' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: expanded ? 'visible' : 'hidden',
              }}>
                <MarkdownRenderer content={todo.description} />
              </div>
              {descLong && (
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setExpanded(s => !s)}
                  style={{ fontSize: 11, padding: '2px 0', color: p.color, marginTop: 2 }}>
                  {expanded ? 'Show less ↑' : 'Read more →'}
                </button>
              )}
            </div>
          )}

          {/* Row 2: meta badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Priority badge */}
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: p.bg, color: p.color,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {todo.priority}
            </span>

            {/* Due date badge */}
            <DueBadge dateStr={todo.due_date} isDone={isDone} />

            {/* Completed at */}
            {isDone && todo.completed_at && (
              <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)', letterSpacing: 0.3 }}>
                ✓ {format(parseISO(todo.completed_at), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="btn btn-ghost"
            onClick={e => { e.stopPropagation(); setIsEditing(true); }}
            title="Edit"
            style={{ color: 'rgba(13,13,13,0.3)', padding: 6, fontSize: 13, lineHeight: 1 }}>
            ✎
          </button>
          <button className="btn btn-ghost"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Delete"
            style={{ color: 'rgba(196,98,58,0.5)', padding: 6, fontSize: 13, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
