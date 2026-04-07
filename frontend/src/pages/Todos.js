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

  if (loading) return <div className="page-body">Loading...</div>;

  const pending = todos.filter(t => t.status === 'pending');
  const done = todos.filter(t => t.status === 'done');

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
        {showAdd && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid var(--sage)' }}>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="What needs to be done?" 
                value={newTodo.title}
                onChange={e => setNewTodo({...newTodo, title: e.target.value})}
                autoFocus
                style={{ flex: 1 }}
              />
              <select className="form-select" style={{ width: 120 }} value={newTodo.priority} onChange={e => setNewTodo({...newTodo, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button type="submit" className="btn btn-primary">Save</button>
            </form>
          </div>
        )}

        <div className="grid-2">
          {/* Pending */}
          <div>
            <div className="section-title">Pending ({pending.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.length === 0 && <div style={{ color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>No pending tasks!</div>}
              {pending.map(t => (
                <TodoCard key={t.id} todo={t} onToggle={() => toggleComplete(t.id, t.status)} onDelete={() => deleteTodo(t.id)} />
              ))}
            </div>
          </div>

          {/* Done */}
          <div>
            <div className="section-title">Completed ({done.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.7 }}>
              {done.map(t => (
                <TodoCard key={t.id} todo={t} onToggle={() => toggleComplete(t.id, t.status)} onDelete={() => deleteTodo(t.id)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoCard({ todo, onToggle, onDelete }) {
  const isDone = todo.status === 'done';
  const priorityColors = { low: 'var(--mist)', medium: 'var(--gold)', high: 'var(--rust)' };

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
          <span style={{ fontSize: 15, fontWeight: 500 }}>{todo.title}</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColors[todo.priority] || 'var(--mist)' }} title={`${todo.priority} priority`} />
        </div>
        {todo.description && <div style={{ fontSize: 12, marginTop: 4, color: 'rgba(13,13,13,0.6)' }}><MarkdownRenderer content={todo.description} /></div>}
      </div>
      <button className="btn btn-ghost" onClick={onDelete} style={{ color: 'var(--rust)', padding: 4 }}>✕</button>
    </div>
  );
}
