import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { PRIORITY, fmtMinutes, TimeAccuracy, TimeEstimateInput, DueBadge } from './todoParts';

// ── Confirm modal ───────────────────────────────────────────────────────────
export function ConfirmModal({ title, body, onConfirm, onCancel }) {
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
export function CompleteModal({ todo, defaultMinutes, onConfirm, onCancel }) {
  const [actualMinutes, setActualMinutes] = useState(
    defaultMinutes !== undefined && defaultMinutes !== null
      ? defaultMinutes
      : (todo.estimated_minutes || null)
  );

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

          <label style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
            color: 'rgba(13,13,13,0.4)', fontWeight: 700, display: 'block', marginBottom: 10
          }}>
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
export function TodoPreviewModal({ todo, onClose, onComplete, onReopen, onDelete, onEdit }) {
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
              <div style={{
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
                color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 8
              }}>Description</div>
              <div className="markdown-body" style={{
                fontSize: 15, lineHeight: 1.75, color: 'rgba(13,13,13,0.75)',
                padding: '14px 18px', background: 'var(--mist)', borderRadius: 10,
              }}>
                <MarkdownRenderer content={todo.description} />
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: 13, color: 'rgba(13,13,13,0.25)', fontStyle: 'italic',
              textAlign: 'center', padding: '8px 0 16px'
            }}>
              No description added.
            </div>
          )}

          {/* Time tracking block */}
          <div style={{
            background: 'white', border: '1px solid rgba(13,13,13,0.07)',
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
              color: 'rgba(13,13,13,0.35)', fontWeight: 700, marginBottom: 12
            }}>
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
