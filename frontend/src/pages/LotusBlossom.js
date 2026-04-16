import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

const generateId = () => Math.random().toString(36).substring(2, 10);

export default function LotusBlossom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blossomData, setBlossomData] = useState(null);
  const [nodes, setNodes] = useState({});
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedChildIndex, setSelectedChildIndex] = useState(null); // To know what to focus
  const [modalMode, setModalMode] = useState('view'); // 'view' or 'edit'

  // Debounce saving
  const timerRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    fetchBlossom();
    // eslint-disable-next-line
  }, [id]);

  const fetchBlossom = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/lotus/${id}`);
      setBlossomData(res.data);
      setNodes(res.data.nodes);
      setActiveNodeId(res.data.activeNodeId);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to fetch Lotus Blossom'));
      navigate('/lotus');
    } finally {
      setLoading(false);
    }
  };

  const autoSave = (newNodes, newActiveId) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setNodes(newNodes);
    setActiveNodeId(newActiveId);

    timerRef.current = setTimeout(async () => {
      try {
        savingRef.current = true;
        await API.put(`/lotus/${id}`, {
          nodes: newNodes,
          activeNodeId: newActiveId
        });
      } catch (err) {
        toast.error('Failed to auto-save changes');
      } finally {
        savingRef.current = false;
      }
    }, 1000);
  };

  if (loading || !activeNodeId || !nodes[activeNodeId]) {
    return (
      <div className="lotus-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(13,13,13,0.5)' }}>Loading Blossom...</div>
      </div>
    );
  }

  const activeNode = nodes[activeNodeId];

  const gridCells = [
    { type: 'child', childIndex: 0, gridIndex: 0 },
    { type: 'child', childIndex: 1, gridIndex: 1 },
    { type: 'child', childIndex: 2, gridIndex: 2 },
    { type: 'child', childIndex: 3, gridIndex: 3 },
    { type: 'center', gridIndex: 4 },
    { type: 'child', childIndex: 4, gridIndex: 5 },
    { type: 'child', childIndex: 5, gridIndex: 6 },
    { type: 'child', childIndex: 6, gridIndex: 7 },
    { type: 'child', childIndex: 7, gridIndex: 8 },
  ];

  const handleNodeUpdate = (nodeId, updates) => {
    const newNodes = { ...nodes, [nodeId]: { ...nodes[nodeId], ...updates } };
    autoSave(newNodes, activeNodeId);
  };

  const handleExpand = (childIndex) => {
    let childId = activeNode.childrenIds[childIndex];
    let childNode = nodes[childId];
    let newNodes = { ...nodes };

    if (!childNode.childrenIds[0]) {
      const childrenIds = [];
      for (let i = 0; i < 8; i++) {
        const nid = generateId();
        childrenIds.push(nid);
        newNodes[nid] = { id: nid, text: '', description: '', parentId: childId, childrenIds: Array(8).fill(null) };
      }
      childNode = { ...childNode, childrenIds };
      newNodes[childId] = childNode;
    }

    autoSave(newNodes, childId);
  };

  const navigateUp = () => {
    if (activeNode.parentId && nodes[activeNode.parentId]) {
      autoSave(nodes, activeNode.parentId);
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setBlossomData({ ...blossomData, title: newTitle });
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await API.put(`/lotus/${id}`, { title: newTitle });
      } catch (err) {
        toast.error('Failed to save title');
      }
    }, 1000);
  };

  const openSelectionModal = (nodeId, childIndex) => {
    setSelectedNodeId(nodeId);
    setSelectedChildIndex(childIndex);
    // Auto-open in edit mode if it's completely empty, otherwise view mode
    const textEmpty = !nodes[nodeId]?.text?.trim();
    const descEmpty = !nodes[nodeId]?.description?.trim();
    if (textEmpty && descEmpty) {
      setModalMode('edit');
    } else {
      setModalMode('view');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => navigate('/lotus')} 
          style={{ padding: 0, marginBottom: 16, color: 'rgba(13,13,13,0.5)' }}
        >
          ← Back to List
        </button>
        <input 
          type="text" 
          value={blossomData?.title || ''}
          onChange={handleTitleChange}
          placeholder="Untitled Blossom"
          style={{ 
            fontSize: 28, 
            fontFamily: 'Fraunces, serif',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            width: '100%',
            color: 'var(--ink)'
          }}
        />
      </div>

      <div className="lotus-container">
        <div className="lotus-header" style={{ marginBottom: 24 }}>
          <div className="lotus-controls" style={{ justifyContent: 'center', marginTop: 0 }}>
            {activeNode.parentId ? (
              <button className="lotus-zoom-out" onClick={navigateUp}>
                <span>↑</span> Move Up to Parent
              </button>
            ) : (
              <div className="lotus-path" style={{ background: 'var(--mist)', padding: '6px 12px', borderRadius: '100px' }}>
                Currently at the root idea
              </div>
            )}
          </div>
        </div>

        <div className="lotus-wrapper">
          <div className="lotus-grid">
            {gridCells.map((cell) => {
              if (cell.type === 'center') {
                return (
                  <div 
                    key="center" 
                    className="lotus-cell is-center" 
                    onClick={() => openSelectionModal(activeNodeId, null)} 
                    title="Click to view/edit this idea"
                  >
                    <div className="lotus-cell-inner" style={{ padding: '8px', wordBreak: 'break-word' }}>
                      <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--paper)', opacity: activeNode.text ? 1 : 0.6 }}>
                        {activeNode.text || "Core Idea..."}
                      </div>
                    </div>
                  </div>
                );
              }

              const childId = activeNode.childrenIds[cell.childIndex];
              const childNode = nodes[childId];
              const hasExpanded = childNode && childNode.childrenIds && childNode.childrenIds[0] !== null;

              return (
                <div 
                  key={cell.gridIndex} 
                  className="lotus-cell"
                  onClick={() => openSelectionModal(childId, cell.childIndex)}
                  title="Click to view/edit this idea"
                >
                  <div className="lotus-cell-inner" style={{ padding: '8px', wordBreak: 'break-word' }}>
                    <div style={{ fontSize: '14px', color: 'var(--ink)', opacity: childNode?.text ? 1 : 0.4 }}>
                      {childNode && childNode.text ? childNode.text : `Idea ${cell.childIndex + 1}...`}
                    </div>
                  </div>
                  {hasExpanded && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, backgroundColor: 'var(--sage)', borderRadius: '50%' }} title="Has sub-ideas"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Node Details Modal */}
      {selectedNodeId && nodes[selectedNodeId] && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedNodeId(null); }} style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <button 
                  className={`btn btn-sm ${modalMode === 'view' ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setModalMode('view')}
                  style={{ borderRadius: 20 }}
                >
                  View
                </button>
                <button 
                  className={`btn btn-sm ${modalMode === 'edit' ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setModalMode('edit')}
                  style={{ borderRadius: 20 }}
                >
                  Edit
                </button>
              </div>
              <button className="modal-close" onClick={() => setSelectedNodeId(null)}>✕</button>
            </div>
            
            <div style={{ padding: '8px 0 24px' }}>
              {modalMode === 'edit' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={nodes[selectedNodeId].text} 
                      onChange={(e) => handleNodeUpdate(selectedNodeId, { text: e.target.value })}
                      placeholder="Title of this idea..."
                      maxLength={2000}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-textarea" 
                      value={nodes[selectedNodeId].description || ''} 
                      onChange={(e) => handleNodeUpdate(selectedNodeId, { description: e.target.value })}
                      placeholder="Elaborate on this idea..."
                      style={{ minHeight: 200 }}
                      maxLength={5000}
                    />
                    <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>Markdown supported</div>
                  </div>
                </>
              ) : (
                <div style={{ minHeight: 280 }}>
                  <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--ink)' }}>
                    {nodes[selectedNodeId].text || <span style={{ opacity: 0.4 }}>No Title</span>}
                  </h3>
                  <div className="markdown-body" style={{ color: 'var(--ink)' }}>
                    {nodes[selectedNodeId].description ? (
                      <MarkdownRenderer content={nodes[selectedNodeId].description} />
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'rgba(13,13,13,0.4)' }}>No description provided.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedChildIndex !== null && (
              <div style={{ borderTop: '1px solid rgba(13,13,13,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => setSelectedNodeId(null)}
                >
                  Close
                </button>
                <button 
                  className="btn btn-gold" 
                  onClick={() => {
                    // Dive / Expand into this node
                    handleExpand(selectedChildIndex);
                    setSelectedNodeId(null);
                  }}
                  title="Make this idea the center of a new 3x3 grid"
                >
                  Focus this Idea ⤢
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
