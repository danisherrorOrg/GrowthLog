import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { parseISO, isPast, isToday } from 'date-fns';
import { todayRank } from '../components/focus/quickCheck';
import FocusTimer, { playZenChime, formatClock } from '../components/todos/FocusTimer';
import useFocusSession from '../components/todos/useFocusSession';
import { useAuth } from '../context/AuthContext';
import AddTodoForm from '../components/todos/AddTodoForm';
import TodoCard, { SkeletonCard } from '../components/todos/TodoCard';
import { ConfirmModal, CompleteModal } from '../components/todos/TodoModals';

// ── Main component ──────────────────────────────────────────────────────────
export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null); // for complete-with-time modal
  const [completeDefaultMinutes, setCompleteDefaultMinutes] = useState(null);

  // ── Pomodoro focus session (saved, so it survives leaving the page) ───────
  const userId = useAuth()?.user?.id;
  const focus = useFocusSession(userId, {
    onFinish: (todo, seconds) => {
      playZenChime();
      toast.success('⏱️ Focus session completed! Outstanding job.');
      setCompleteDefaultMinutes(Math.max(1, Math.round(seconds / 60)));
      setCompleteTarget(todos.find(t => t.id === todo.id) || todo);
    },
  });
  const focusTodo = focus.focusTodo;
  const [pendingDuration, setPendingDuration] = useState(null); // preset waiting for confirmation

  const handleStartFocus = (todo) => {
    focus.start(todo);
    toast.success(`⏱️ Focus session started for: ${todo.title}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePickDuration = (sec) => {
    if (sec === focus.duration) return;
    // Switching presets restarts the countdown, so ask first if it has started
    if (focus.roundSeconds > 0 && focus.remaining > 0) setPendingDuration(sec);
    else focus.pickDuration(sec);
  };

  const handleOpenCompleteModal = (todo) => {
    if (focusTodo && focusTodo.id === todo.id && focus.totalSeconds > 5) {
      setCompleteDefaultMinutes(Math.max(1, Math.round(focus.totalSeconds / 60)));
    } else {
      setCompleteDefaultMinutes(null);
    }
    setCompleteTarget(todo);
  };

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

  // Drop a saved session whose task was deleted or finished elsewhere; follow renames
  useEffect(() => {
    if (loading || !focusTodo) return;
    const match = todos.find(t => t.id === focusTodo.id);
    if (!match || match.status !== 'pending') focus.clear();
    else if (match.title !== focusTodo.title) focus.renameTodo(match.title);
  }, [loading, todos, focusTodo]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (newTodo) => {
    try {
      const res = await API.post('/todos', newTodo);
      setTodos([res.data, ...todos]);
      setShowAdd(false);
      toast.success('✦ Task added');
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add task'));
      return false;
    }
  };

  // Called from the CompleteModal with actual_minutes value
  const handleComplete = async (id, actualMinutes) => {
    try {
      const res = await API.patch(`/todos/${id}/complete`, { actual_minutes: actualMinutes || null });
      setTodos(todos.map(t => t.id === id ? res.data : t));
      setCompleteTarget(null);
      setCompleteDefaultMinutes(null);

      // If the completed task was our active focus task, reset focus
      if (focusTodo && focusTodo.id === id) {
        focus.clear();
        toast.success('✦ Focus task completed! Great job!');
      } else {
        toast.success('✦ Task completed');
      }
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
    if (filter === 'active') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'done';
    if (filter === 'high') return t.status === 'pending' && t.priority === 'high';
    if (filter === 'overdue') return t.status === 'pending' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
    return true;
  };

  const applySearch = (t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
  };

  const visible = todos.filter(t => applyFilter(t) && applySearch(t));
  // Today's Morning Plan picks float to the top; otherwise keep the existing order
  const pending = visible.filter(t => t.status === 'pending')
    .sort((a, b) => todayRank(a)[0] - todayRank(b)[0]);
  const done = visible.filter(t => t.status === 'done');
  const overdueCount = todos.filter(t =>
    t.status === 'pending' && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  ).length;

  return (
    <div>
      <div className="page-header">
        <h1>Action Board 🎯</h1>
        <p>Capture intentions. Ship them. Reflect on the effort.</p>
      </div>

      <div className="page-body">
        <FocusTimer
          focusTodo={focusTodo}
          timerSeconds={focus.remaining}
          timerDuration={focus.duration}
          isTimerRunning={focus.isRunning}
          onPickDuration={handlePickDuration}
          onToggle={focus.toggle}
          onReset={focus.reset}
          onComplete={() => handleOpenCompleteModal(focusTodo)}
          onClear={focus.clear}
        />

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
            <div className="filter-pills" style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'high', label: '🔴 High' },
                { key: 'overdue', label: '⚠️ Overdue' },
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
                style={{ padding: '7px 12px 7px 32px', fontSize: 12, height: 'auto', width: '100%', minWidth: 180 }} />
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
        {showAdd && <AddTodoForm onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

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
                <h3 style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'var(--sage)', fontWeight: 700, margin: 0
                }}>Upcoming Focus</h3>
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
                    focusTodo={focusTodo}
                    onFocus={handleStartFocus}
                    onComplete={() => handleOpenCompleteModal(t)}
                    onReopen={() => handleReopen(t.id)}
                    onDelete={() => confirmDelete(t.id)}
                    onSave={handleEdit} />
                ))
              )}
            </div>

            {/* Done column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  color: 'rgba(13,13,13,0.35)', fontWeight: 700, margin: 0
                }}>Completed</h3>
                <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.25)' }}>
                  {done.length} task{done.length !== 1 ? 's' : ''}
                </span>
              </div>
              {done.length === 0 ? (
                <div style={{
                  padding: '32px 0', textAlign: 'center', fontSize: 12,
                  color: 'rgba(13,13,13,0.2)', fontStyle: 'italic'
                }}>
                  No completed tasks in current view.
                </div>
              ) : (() => {
                const DONE_LIMIT = 5;
                const showAll = filter === 'completed';
                const visibleDone = showAll ? done : done.slice(0, DONE_LIMIT);
                const hiddenCount = done.length - visibleDone.length;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {visibleDone.map(t => (
                      <TodoCard key={t.id} todo={t}
                        focusTodo={focusTodo}
                        onFocus={handleStartFocus}
                        onComplete={() => handleOpenCompleteModal(t)}
                        onReopen={() => handleReopen(t.id)}
                        onDelete={() => confirmDelete(t.id)}
                        onSave={handleEdit} />
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        onClick={() => setFilter('completed')}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, color: 'rgba(13,13,13,0.35)',
                          textAlign: 'center', padding: '6px 0',
                          letterSpacing: 0.3,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--sage)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,13,13,0.35)'}
                      >
                        + {hiddenCount} more completed · View all →
                      </button>
                    )}
                  </div>
                );
              })()}
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

      {pendingDuration && (
        <ConfirmModal
          title="Restart the timer?"
          body={`You're ${formatClock(focus.roundSeconds)} into this ${focus.duration / 60}-minute session. Switching to ${pendingDuration / 60} minutes starts the countdown over. Time you've already focused still counts toward the task.`}
          confirmLabel={`Switch to ${pendingDuration / 60}m`}
          cancelLabel="Keep going"
          onConfirm={() => { focus.pickDuration(pendingDuration); setPendingDuration(null); }}
          onCancel={() => setPendingDuration(null)}
        />
      )}
      {completeTarget && (
        <CompleteModal
          todo={completeTarget}
          defaultMinutes={completeDefaultMinutes}
          onConfirm={(actualMinutes) => handleComplete(completeTarget.id, actualMinutes)}
          onCancel={() => {
            setCompleteTarget(null);
            setCompleteDefaultMinutes(null);
          }}
        />
      )}
    </div>
  );
}
