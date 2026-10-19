import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { localDate } from '../focus/quickCheck';
import { PRIORITY, PLAN_BADGES, fmtMinutes, TimeEstimateInput, DueBadge } from './todoParts';
import { TodoPreviewModal } from './TodoModals';

// ── Skeleton loader ─────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 6 }} />
    </div>
  );
}

// ── TodoCard ────────────────────────────────────────────────────────────────
export default function TodoCard({ todo, focusTodo, onFocus, onComplete, onReopen, onDelete, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editForm, setEditForm] = useState({
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
        borderLeft: focusTodo && focusTodo.id === todo.id ? '4px solid var(--gold)' : `4px solid ${p.color}`,
        boxShadow: focusTodo && focusTodo.id === todo.id ? '0 4px 14px rgba(201,168,76,0.18)' : '0 2px 8px rgba(13,13,13,0.04)',
        background: isDone ? 'var(--mist)' : focusTodo && focusTodo.id === todo.id ? 'rgba(201,168,76,0.02)' : 'white',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        marginBottom: 0,
      }}
        onClick={() => setShowPreview(true)}
        onMouseEnter={e => {
          if (!isDone) {
            e.currentTarget.style.boxShadow = focusTodo && focusTodo.id === todo.id
              ? '0 6px 20px rgba(201,168,76,0.25)'
              : '0 4px 16px rgba(13,13,13,0.08)';
          } else {
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(13,13,13,0.07)';
            e.currentTarget.style.background = 'rgba(13,13,13,0.04)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = focusTodo && focusTodo.id === todo.id
            ? '0 4px 14px rgba(201,168,76,0.18)'
            : '0 2px 8px rgba(13,13,13,0.04)';
          if (isDone) e.currentTarget.style.background = 'var(--mist)';
          else if (focusTodo && focusTodo.id === todo.id) e.currentTarget.style.background = 'rgba(201,168,76,0.02)';
          else e.currentTarget.style.background = 'white';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Checkbox */}
          <input type="checkbox" checked={isDone}
            onChange={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              if (isDone) {
                // For completed tasks, open the preview so reopen is deliberate
                setShowPreview(true);
              } else {
                onComplete();
              }
            }}
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
              {!isDone && todo.plan_date === localDate() && PLAN_BADGES[todo.plan_verdict] && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: PLAN_BADGES[todo.plan_verdict].bg, color: PLAN_BADGES[todo.plan_verdict].color,
                }}>
                  {PLAN_BADGES[todo.plan_verdict].label}
                </span>
              )}
              {!isDone && todo.delegated && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(201,168,76,0.15)', color: '#a07a10',
                }}>
                  🤝 Hand off
                </span>
              )}

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

              {/* Focus Badge Button */}
              {!isDone && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onFocus(todo);
                  }}
                  className="btn btn-sm"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 20,
                    border: '1px solid',
                    borderColor: focusTodo && focusTodo.id === todo.id ? 'var(--gold)' : 'rgba(13,13,13,0.12)',
                    background: focusTodo && focusTodo.id === todo.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                    color: focusTodo && focusTodo.id === todo.id ? 'var(--gold)' : 'rgba(13,13,13,0.5)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  ⏱️ {focusTodo && focusTodo.id === todo.id ? 'Focusing...' : 'Focus'}
                </button>
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
