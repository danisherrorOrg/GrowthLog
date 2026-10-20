import { useEffect, useRef, useState } from 'react';
import { PRIORITY, TimeEstimateInput } from './todoParts';
import { localDate } from '../../utils/dates';

const EMPTY_TODO = { title: '', description: '', priority: 'medium', due_date: '', estimated_minutes: null };

// onAdd resolves to true once the task is saved, which clears the form
export default function AddTodoForm({ onAdd, onClose }) {
  const [newTodo, setNewTodo] = useState(EMPTY_TODO);
  const addTitleRef = useRef(null);

  useEffect(() => { addTitleRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;
    if (await onAdd(newTodo)) setNewTodo(EMPTY_TODO);
  };

  return (
    <div className="card" style={{ marginBottom: 32, border: '2px solid var(--sage)', background: 'rgba(107,140,107,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>New Task</h3>
        <button className="btn btn-ghost" onClick={onClose}>✕</button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          ref={addTitleRef}
          type="text"
          className="form-input"
          placeholder="What needs to be done?"
          value={newTodo.title}
          onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
          style={{
            fontSize: 17, border: 'none', background: 'transparent', padding: 0,
            borderBottom: '1px solid rgba(13,13,13,0.12)', borderRadius: 0, fontWeight: 500
          }}
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
              min={localDate()}
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
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px' }}>
            Capture Task ✦
          </button>
        </div>
      </form>
    </div>
  );
}
