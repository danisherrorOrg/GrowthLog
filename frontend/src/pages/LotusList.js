import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function LotusList() {
  const [blossoms, setBlossoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlossoms();
  }, []);

  const fetchBlossoms = async () => {
    try {
      const res = await API.get('/lotus');
      setBlossoms(res.data);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to fetch Lotus Blossoms'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Create empty root node logic inline
      const generateId = () => Math.random().toString(36).substring(2, 10);
      const rootId = generateId();
      const nodesMap = {};
      
      nodesMap[rootId] = {
        id: rootId,
        text: '',
        parentId: null,
        childrenIds: []
      };
      
      for (let i = 0; i < 8; i++) {
        const childId = generateId();
        nodesMap[rootId].childrenIds.push(childId);
        nodesMap[childId] = {
          id: childId,
          text: '',
          parentId: rootId,
          childrenIds: Array(8).fill(null)
        };
      }

      const payload = {
        title: "Untitled Blossom",
        nodes: nodesMap,
        activeNodeId: rootId
      };

      const res = await API.post('/lotus', payload);
      navigate(`/lotus/${res.data.id}`);
      toast.success('Lotus Blossom created');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to create Lotus Blossom'));
    }
  };

  const handleDelete = (e, b) => {
    e.stopPropagation();
    setConfirm({
      title: 'Delete Lotus Blossom?',
      message: 'Are you sure you want to permanently delete this brainstorm session and all its nested sub-ideas? This cannot be undone.',
      confirmLabel: 'Delete Forever',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/lotus/${b.id}`);
          setBlossoms(blossoms.filter(item => item.id !== b.id));
          toast.success('Deleted successfully');
        } catch (err) {
          toast.error(getErrorMessage(err, 'Failed to delete'));
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: 'center', marginTop: 100 }}>
        <span style={{ fontSize: 32 }}>🌸</span>
        <p style={{ color: 'rgba(13,13,13,0.5)', marginTop: 16 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>Lotus Blossoms</h2>
          <p>Organize your ideas systematically in expanding grids.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <span>+</span> Create New
        </button>
      </div>

      <div className="page-body">
        {blossoms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌸</div>
            <h3>No Lotus Blossoms yet</h3>
            <p>Start a new brainstorm session to visually break down a core idea into actionable elements.</p>
            <button className="btn btn-gold" onClick={handleCreate} style={{ marginTop: 16 }}>
              Create First Blossom
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {blossoms.map(b => {
              const rootText = b.nodes[b.nodes[b.activeNodeId]?.parentId === null ? b.activeNodeId : Object.values(b.nodes).find(n => n.parentId === null)?.id]?.text || 'Untitled';
              const title = b.title !== 'Untitled Blossom' ? b.title : (rootText.trim() ? rootText : 'Untitled Blossom');
              
              const dateObj = new Date(b.created_at || b.updated_at);
              const dateStr = isNaN(dateObj) ? '' : dateObj.toLocaleDateString();

              return (
                <div key={b.id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/lotus/${b.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 18, margin: 0, padding: 0 }}>{title}</h4>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '4px 8px', margin: '-4px -8px 0 0' }}
                      onClick={(e) => handleDelete(e, b)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(13,13,13,0.06)', fontSize: 12, color: 'rgba(13,13,13,0.4)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{Object.keys(b.nodes).length} nodes</span>
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
