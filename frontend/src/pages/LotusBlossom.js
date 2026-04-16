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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'graph'

  // Modal State
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedChildIndex, setSelectedChildIndex] = useState(null);
  const [modalMode, setModalMode] = useState('view');

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isOverIndex, setIsOverIndex] = useState(null);

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

  // Breadcrumbs Logic
  const getBreadcrumbs = () => {
    const crumbs = [];
    let currId = activeNodeId;
    while (currId && nodes[currId]) {
      crumbs.unshift({ id: currId, text: nodes[currId].text || 'Unnamed Idea' });
      currId = nodes[currId].parentId;
    }
    return crumbs;
  };

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
        newNodes[nid] = { 
          id: nid, 
          text: '', 
          description: '', 
          parentId: childId, 
          childrenIds: Array(8).fill(null),
          status: null
        };
      }
      childNode = { ...childNode, childrenIds };
      newNodes[childId] = childNode;
    }

    autoSave(newNodes, childId);
  };

  const navigateTo = (nodeId) => {
    if (nodes[nodeId]) {
      autoSave(nodes, nodeId);
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
    const textEmpty = !nodes[nodeId]?.text?.trim();
    const descEmpty = !nodes[nodeId]?.description?.trim();
    if (textEmpty && descEmpty) {
      setModalMode('edit');
    } else {
      setModalMode('view');
    }
  };

  // Drag and Drop handlers
  const onDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('is-dragging');
    }, 0);
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setIsOverIndex(index);
  };

  const onDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newChildrenIds = [...activeNode.childrenIds];
    const draggedId = newChildrenIds[draggedIndex];
    const targetId = newChildrenIds[targetIndex];

    newChildrenIds[draggedIndex] = targetId;
    newChildrenIds[targetIndex] = draggedId;

    const newNodes = {
      ...nodes,
      [activeNodeId]: { ...activeNode, childrenIds: newChildrenIds }
    };

    autoSave(newNodes, activeNodeId);
    setDraggedIndex(null);
    setIsOverIndex(null);
    toast.success('Position updated');
  };

  const onDragEnd = (e) => {
    setDraggedIndex(null);
    setIsOverIndex(null);
    e.target.classList.remove('is-dragging');
  };

  // SVG Connections Component for Grid
  const LotusConnections = () => {
    return (
      <svg className="lotus-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
        {gridCells.filter(c => c.type === 'child').map((cell) => {
          const coords = [
            { x: 16.6, y: 16.6 }, { x: 50, y: 16.6 }, { x: 83.4, y: 16.6 },
            { x: 16.6, y: 50 },   { x: 50, y: 50 },   { x: 83.4, y: 50 },
            { x: 16.6, y: 83.4 }, { x: 50, y: 83.4 }, { x: 83.4, y: 83.4 }
          ];
          const start = coords[4];
          const end = coords[cell.gridIndex];
          
          return (
            <path 
              key={cell.gridIndex}
              d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
              style={{ stroke: isOverIndex === cell.childIndex ? 'var(--gold)' : 'rgba(13,13,13,0.08)' }}
            />
          );
        })}
      </svg>
    );
  };

  // Graph View Logic
  const renderGraph = () => {
    const rootNodeId = Object.keys(nodes).find(nid => !nodes[nid].parentId);
    if (!rootNodeId) return null;

    const nodesToRender = [];
    const edgesToRender = [];
    const visited = new Set();

    const calculateLayout = (nodeId, x, y, angle, depth, spread) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes[nodeId];
      nodesToRender.push({ id: nodeId, x, y, text: node.text });

      const children = node.childrenIds.filter(id => id && nodes[id]);
      const childCount = children.length;
      if (childCount === 0) return;

      const angleStep = spread / Math.max(1, childCount - (depth === 0 ? 0 : 1));
      let startAngle = angle - spread / 2;

      children.forEach((childId, i) => {
        const childAngle = startAngle + i * angleStep;
        const dist = 140 / (depth + 1);
        const nextX = x + Math.cos(childAngle) * dist;
        const nextY = y + Math.sin(childAngle) * dist;

        edgesToRender.push({ x1: x, y1: y, x2: nextX, y2: nextY });
        calculateLayout(childId, nextX, nextY, childAngle, depth + 1, spread * 0.8);
      });
    };

    calculateLayout(rootNodeId, 500, 350, 0, 0, Math.PI * 2);

    return (
      <div className="lotus-graph-view">
        <svg className="graph-svg" viewBox="0 0 1000 700">
          {edgesToRender.map((edge, i) => (
            <line key={i} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} className="graph-edge" />
          ))}
          {nodesToRender.map((node) => (
            <g 
              key={node.id} 
              className={`graph-node ${node.id === activeNodeId ? 'is-active' : ''}`}
              onClick={() => openSelectionModal(node.id, null)}
              onDoubleClick={() => {
                navigateTo(node.id);
                setViewMode('grid');
              }}
            >
              <circle cx={node.x} cy={node.y} r={6} />
              <text x={node.x} y={node.y + 18}>{node.text || '...'}</text>
            </g>
          ))}
        </svg>
        <div style={{ position: 'absolute', bottom: 20, right: 20, fontSize: 12, opacity: 0.5 }}>
          Double-click to Focus • Drag not supported in Graph View
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
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
                maxWidth: 500,
                color: 'var(--ink)'
              }}
            />
          </div>
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
              onClick={() => setViewMode('graph')}
            >
              Graph View 🕸️
            </button>
          </div>
        </div>
      </div>

      <div className="lotus-container" style={{ minHeight: viewMode === 'graph' ? 'auto' : '80vh' }}>
        {viewMode === 'grid' && (
          <div className="lotus-header">
            <nav className="lotus-breadcrumb-nav">
              {getBreadcrumbs().map((crumb, idx, arr) => (
                <React.Fragment key={crumb.id}>
                  <span 
                    className={`breadcrumb-item ${idx === arr.length - 1 ? 'active' : ''}`}
                    onClick={() => idx < arr.length - 1 && navigateTo(crumb.id)}
                  >
                    {crumb.text}
                  </span>
                  {idx < arr.length - 1 && <span className="breadcrumb-separator">➔</span>}
                </React.Fragment>
              ))}
            </nav>
          </div>
        )}

        <div className="lotus-wrapper">
          {viewMode === 'grid' ? (
            <div className="lotus-grid-container">
              <LotusConnections />
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
                        <div className="lotus-cell-inner">
                          <div className="cell-text" style={{ opacity: activeNode.text ? 1 : 0.6 }}>
                            {activeNode.text || "Core Idea..."}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const childId = activeNode.childrenIds[cell.childIndex];
                  const childNode = nodes[childId];
                  const hasExpanded = childNode && childNode.childrenIds && childNode.childrenIds[0] !== null;
                  const status = childNode?.status;

                  return (
                    <div 
                      key={cell.gridIndex} 
                      className={`lotus-cell ${status ? `status-${status.toLowerCase()}` : ''} ${isOverIndex === cell.childIndex ? 'is-over' : ''}`}
                      onClick={() => openSelectionModal(childId, cell.childIndex)}
                      draggable
                      onDragStart={(e) => onDragStart(e, cell.childIndex)}
                      onDragOver={(e) => onDragOver(e, cell.childIndex)}
                      onDrop={(e) => onDrop(e, cell.childIndex)}
                      onDragEnd={onDragEnd}
                    >
                      {status && (
                        <div className="status-badge">{status}</div>
                      )}
                      <div className="lotus-cell-inner">
                        <div className="cell-text" style={{ color: 'var(--ink)', opacity: childNode?.text ? 1 : 0.4 }}>
                          {childNode && childNode.text ? childNode.text : `Idea ${cell.childIndex + 1}...`}
                        </div>
                      </div>
                      {hasExpanded && (
                        <div className="lotus-expand-indicator" title="Has sub-ideas"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            renderGraph()
          )}
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

                  {nodes[selectedNodeId].parentId && (
                    <div className="form-group">
                      <label className="form-label">Priority / Status</label>
                      <div className="status-picker">
                        {['Validated', 'Promising', 'Blocked'].map((s) => (
                          <div 
                            key={s}
                            className={`status-option ${s.toLowerCase()} ${nodes[selectedNodeId].status === s ? 'selected' : ''}`}
                            onClick={() => handleNodeUpdate(selectedNodeId, { status: nodes[selectedNodeId].status === s ? null : s })}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 24, margin: 0, color: 'var(--ink)' }}>
                      {nodes[selectedNodeId].text || <span style={{ opacity: 0.4 }}>No Title</span>}
                    </h3>
                    {nodes[selectedNodeId].status && (
                      <span className={`tag tag-${nodes[selectedNodeId].status.toLowerCase() == 'validated' ? 'green' : nodes[selectedNodeId].status.toLowerCase() == 'promising' ? 'gold' : 'rust'}`}>
                        {nodes[selectedNodeId].status}
                      </span>
                    )}
                  </div>
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

            <div style={{ borderTop: '1px solid rgba(13,13,13,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setSelectedNodeId(null)}
              >
                Close
              </button>
              {selectedNodeId !== activeNodeId && (
                <button 
                  className="btn btn-gold" 
                  onClick={() => {
                    if (selectedChildIndex !== null) {
                      handleExpand(selectedChildIndex);
                    } else {
                      navigateTo(selectedNodeId);
                    }
                    setSelectedNodeId(null);
                  }}
                  title="Make this idea the center of a new 3x3 grid"
                >
                  Focus this Idea ⤢
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
