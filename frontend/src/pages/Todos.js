import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { format } from 'date-fns';

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTodo, setNewTodo] = useState({ title: '', priority: 'medium', due_date: '' });

  const [filter, setFilter] = useState('all');

  const fetchTodos = async () => {
    try {
      const res = await API.get('/todos');
      setTodos(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load todos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;
    try {
      const res = await API.post('/todos', newTodo);
      setTodos([res.data, ...todos]);
      setNewTodo({ title: '', priority: 'medium', due_date: '' });
      setShowAdd(false);
      toast.success('Task added');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add task'));
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    const isDone = currentStatus === 'done';
    const newStatus = isDone ? 'pending' : 'done';
    try {
      const endpoint = isDone ? `/todos/${id}` : `/todos/${id}/complete`;
      const payload = isDone ? { status: 'pending' } : null;
      
      let res;
      if (isDone) res = await API.put(endpoint, payload);
      else res = await API.patch(endpoint);
      
      setTodos(todos.map(t => t.id === id ? res.data : t));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  const deleteTodo = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await API.delete(`/todos/${id}`);
      setTodos(todos.filter(t => t.id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
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

  if (loading) return <div className="page-body">Loading...</div>;

  const filteredTodos = todos.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.status === 'pending';
    if (filter === 'high') return t.status === 'pending' && t.priority === 'high';
    if (filter === 'completed') return t.status === 'done';
    return true;
  });

  const pending = filteredTodos.filter(t => t.status === 'pending');
  const done = filteredTodos.filter(t => t.status === 'done');

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Action Board 🎯</h2>
          <p>Your next steps, organized.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Task</button>
      </div>

      <div className="page-body">
        {/* Unified Toolbar */}
        <div className="card" style={{ marginBottom: 40, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', background: 'var(--mist)', padding: 3, borderRadius: 10 }}>
            <button 
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setFilter('all')}
              style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'all' && { opacity: 0.6 }) }}
            >
              All
            </button>
            <button 
              className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setFilter('active')}
              style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'active' && { opacity: 0.6 }) }}
            >
              Active Tasks
            </button>
            <button 
              className={`btn btn-sm ${filter === 'high' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setFilter('high')}
              style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'high' && { opacity: 0.6 }) }}
            >
              High Priority
            </button>
            <button 
              className={`btn btn-sm ${filter === 'completed' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setFilter('completed')}
              style={{ borderRadius: 8, padding: '6px 16px', fontSize: 11, ... (filter !== 'completed' && { opacity: 0.6 }) }}
            >
              Completed
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ borderRadius: 30, padding: '10px 24px' }}>
            {showAdd ? '✕ Close Input' : '+ Initialize Task'}
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 40, border: '1px solid var(--sage)', background: 'rgba(107,140,107,0.02)' }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Focus on the next step..." 
                    value={newTodo.title}
                    onChange={e => setNewTodo({...newTodo, title: e.target.value})}
                    autoFocus
                    style={{ fontSize: 20, border: 'none', background: 'transparent', padding: 0, borderBottom: '1px solid rgba(13,13,13,0.1)', borderRadius: 0 }}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Markdown Supported ◈ Clear Intent</div>
                </div>
                <div style={{ width: 140 }}>
                   <label className="form-label" style={{ fontSize: 10, letterSpacing: 1 }}>Priority</label>
                   <select className="form-select" value={newTodo.priority} onChange={e => setNewTodo({...newTodo, priority: e.target.value})} style={{ background: 'white' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px' }}>Capture Task ✦</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid-2" style={{ gap: 40 }}>
          {/* Pending */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--sage)', fontWeight: 700 }}>Upcoming Focus ({pending.length})</h3>
               <div style={{ width: 40, height: 2, background: 'var(--sage)', opacity: 0.2 }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pending.length === 0 && (
                <div className="empty-state" style={{ padding: 40, borderStyle: 'dashed' }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>✨</div>
                  <div style={{ fontSize: 14, color: 'rgba(13,13,13,0.4)' }}>All tasks resolved. Rest and iterate.</div>
                </div>
              )}
              {pending.map(t => (
                <TodoCard key={t.id} todo={t} onToggle={() => toggleComplete(t.id, t.status)} onDelete={() => deleteTodo(t.id)} onSave={handleEdit} />
              ))}
            </div>
          </div>

          {/* Done */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(13,13,13,0.4)', fontWeight: 700 }}>Integration ({done.length})</h3>
               <div style={{ width: 40, height: 2, background: 'rgba(13,13,13,0.1)' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: 0.6 }}>
              {done.map(t => (
                <TodoCard key={t.id} todo={t} onToggle={() => toggleComplete(t.id, t.status)} onDelete={() => deleteTodo(t.id)} onSave={handleEdit} />
              ))}
              {done.length === 0 && <div style={{ textAlign: 'center', fontSize: 12, padding: 32, color: 'rgba(13,13,13,0.2)', fontStyle: 'italic' }}>No completed tasks in current view.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoCard({ todo, onToggle, onDelete, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: todo.title, priority: todo.priority });

  const isDone = todo.status === 'done';
  const priorityColors = { low: 'var(--mist)', medium: 'var(--gold)', high: 'var(--rust)' };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    onSave(todo.id, editForm);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="card card-sm" style={{ border: '1px solid var(--sage)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              className="form-input" 
              value={editForm.title}
              onChange={e => setEditForm({...editForm, title: e.target.value})}
              autoFocus
              style={{ width: '100%', padding: '6px 12px' }}
            />
          </div>
          <select className="form-select" style={{ width: 100, padding: '6px 12px' }} value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setIsEditing(false); setEditForm({ title: todo.title, priority: todo.priority }); }}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card card-sm" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <input 
        type="checkbox" 
        checked={isDone} 
        onChange={onToggle}
        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--sage)' }} 
      />
      <div style={{ flex: 1, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'rgba(13,13,13,0.5)' : 'var(--ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="markdown-body" style={{ fontSize: 15, fontWeight: 500 }}><MarkdownRenderer content={todo.title} /></div>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColors[todo.priority] || 'var(--mist)' }} title={`${todo.priority} priority`} />
        </div>
        {todo.description && <div style={{ fontSize: 12, marginTop: 4, color: 'rgba(13,13,13,0.6)' }}><MarkdownRenderer content={todo.description} /></div>}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-ghost" onClick={() => setIsEditing(true)} style={{ color: 'rgba(13,13,13,0.4)', padding: 4 }}>✎</button>
        <button className="btn btn-ghost" onClick={onDelete} style={{ color: 'var(--rust)', padding: 4 }}>✕</button>
      </div>
    </div>
  );
}
