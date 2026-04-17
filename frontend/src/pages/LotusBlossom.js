import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

const generateId = () => Math.random().toString(36).substring(2, 10);

// ─── Force-directed graph layout ────────────────────────────
const useForceGraph = (nodes, activeNodeId) => {
  const [positions, setPositions] = useState({});
  const animRef = useRef(null);
  const posRef = useRef({});
  const velRef = useRef({});

  useEffect(() => {
    if (!nodes || !activeNodeId) return;

    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return;

    // Build edge list
    const edges = [];
    nodeIds.forEach(nid => {
      const n = nodes[nid];
      if (n.childrenIds) {
        n.childrenIds.forEach(cid => {
          if (cid && nodes[cid]) edges.push([nid, cid]);
        });
      }
    });

    // Init positions if not set
    const newPos = {};
    const newVel = {};
    const W = 900, H = 600;
    nodeIds.forEach((nid, i) => {
      if (posRef.current[nid]) {
        newPos[nid] = { ...posRef.current[nid] };
      } else {
        const angle = (i / nodeIds.length) * Math.PI * 2;
        const r = 150 + Math.random() * 80;
        newPos[nid] = { x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r };
      }
      newVel[nid] = posRef.current[nid] ? (velRef.current[nid] || { vx: 0, vy: 0 }) : { vx: 0, vy: 0 };
    });

    posRef.current = newPos;
    velRef.current = newVel;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    let step = 0;
    const MAX_STEPS = 300;

    const simulate = () => {
      step++;
      const pos = posRef.current;
      const vel = velRef.current;
      const alpha = Math.max(0.01, 1 - step / MAX_STEPS);

      // Repulsion between all node pairs
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = nodeIds[i], b = nodeIds[j];
          const dx = pos[b].x - pos[a].x;
          const dy = pos[b].y - pos[a].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (3200) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          vel[a].vx -= fx * alpha;
          vel[a].vy -= fy * alpha;
          vel[b].vx += fx * alpha;
          vel[b].vy += fy * alpha;
        }
      }

      // Attraction along edges
      edges.forEach(([a, b]) => {
        if (!pos[a] || !pos[b]) return;
        const dx = pos[b].x - pos[a].x;
        const dy = pos[b].y - pos[a].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 120;
        const force = (dist - targetDist) * 0.04 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vel[a].vx += fx;
        vel[a].vy += fy;
        vel[b].vx -= fx;
        vel[b].vy -= fy;
      });

      // Gravity toward center
      nodeIds.forEach(nid => {
        const dx = W / 2 - pos[nid].x;
        const dy = H / 2 - pos[nid].y;
        vel[nid].vx += dx * 0.003 * alpha;
        vel[nid].vy += dy * 0.003 * alpha;
      });

      // Integrate
      nodeIds.forEach(nid => {
        vel[nid].vx *= 0.7;
        vel[nid].vy *= 0.7;
        pos[nid].x = Math.max(40, Math.min(W - 40, pos[nid].x + vel[nid].vx));
        pos[nid].y = Math.max(40, Math.min(H - 40, pos[nid].y + vel[nid].vy));
      });

      setPositions({ ...pos });

      if (step < MAX_STEPS) {
        animRef.current = requestAnimationFrame(simulate);
      }
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line
  }, [Object.keys(nodes).length, activeNodeId]);

  return positions;
};

export default function LotusBlossom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blossomData, setBlossomData] = useState(null);
  const [nodes, setNodes] = useState({});
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // Modal State
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedChildIndex, setSelectedChildIndex] = useState(null);
  const [modalMode, setModalMode] = useState('view');

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isOverIndex, setIsOverIndex] = useState(null);

  // Graph interaction state
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [graphTransform, setGraphTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDraggingNode, setIsDraggingNode] = useState(null);
  const svgRef = useRef(null);

  const timerRef = useRef(null);
  const savingRef = useRef(false);

  const graphPositions = useForceGraph(nodes, activeNodeId);

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
        await API.put(`/lotus/${id}`, { nodes: newNodes, activeNodeId: newActiveId });
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
          id: nid, text: '', description: '',
          parentId: childId, childrenIds: Array(8).fill(null), status: null
        };
      }
      childNode = { ...childNode, childrenIds };
      newNodes[childId] = childNode;
    }

    autoSave(newNodes, childId);
  };

  const navigateTo = (nodeId) => {
    if (nodes[nodeId]) autoSave(nodes, nodeId);
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
    setModalMode(textEmpty && descEmpty ? 'edit' : 'view');
  };

  // ─── Grid drag & drop ────────────────────────────────────
  const onDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('is-dragging'), 0);
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== index) setIsOverIndex(index);
  };

  const onDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newChildrenIds = [...activeNode.childrenIds];
    [newChildrenIds[draggedIndex], newChildrenIds[targetIndex]] =
      [newChildrenIds[targetIndex], newChildrenIds[draggedIndex]];
    autoSave({ ...nodes, [activeNodeId]: { ...activeNode, childrenIds: newChildrenIds } }, activeNodeId);
    setDraggedIndex(null);
    setIsOverIndex(null);
    toast.success('Position updated');
  };

  const onDragEnd = (e) => {
    setDraggedIndex(null);
    setIsOverIndex(null);
    e.target.classList.remove('is-dragging');
  };

  // ─── SVG Connections ─────────────────────────────────────
  const LotusConnections = () => (
    <svg className="lotus-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
      {gridCells.filter(c => c.type === 'child').map((cell) => {
        const coords = [
          { x: 16.6, y: 16.6 }, { x: 50, y: 16.6 }, { x: 83.4, y: 16.6 },
          { x: 16.6, y: 50 }, { x: 50, y: 50 }, { x: 83.4, y: 50 },
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

  // ─── Graph helpers ────────────────────────────────────────
  const getNodeRadius = (nodeId) => {
    const n = nodes[nodeId];
    if (!n) return 6;
    const childCount = (n.childrenIds || []).filter(c => c && nodes[c]).length;
    if (!n.parentId) return 14; // root
    if (childCount > 0) return 10;
    return 6;
  };

  const getNodeColor = (nodeId) => {
    if (nodeId === activeNodeId) return '#c9a84c';
    const n = nodes[nodeId];
    if (!n) return '#6b8c6b';
    if (n.status === 'Validated') return '#6b8c6b';
    if (n.status === 'Promising') return '#c9a84c';
    if (n.status === 'Blocked') return '#c4623a';
    if (!n.parentId) return '#e8d5a0';
    return '#4a6b6a';
  };

  const getEdgeOpacity = (sourceId, targetId) => {
    if (!hoveredNodeId) return 0.18;
    if (hoveredNodeId === sourceId || hoveredNodeId === targetId) return 0.8;
    return 0.05;
  };

  const getNodeOpacity = (nodeId) => {
    if (!hoveredNodeId) return 1;
    if (nodeId === hoveredNodeId) return 1;
    const n = nodes[hoveredNodeId];
    if (!n) return 0.3;
    const connected = [
      ...(n.childrenIds || []).filter(c => c && nodes[c]),
      n.parentId
    ].filter(Boolean);
    return connected.includes(nodeId) ? 1 : 0.25;
  };

  // ─── Graph pan & zoom ─────────────────────────────────────
  const handleSvgMouseDown = (e) => {
    if (e.target.closest('.graph-node-group')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - graphTransform.x, y: e.clientY - graphTransform.y });
  };

  const handleSvgMouseMove = (e) => {
    if (isDraggingNode) {
      // Node dragging in graph
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = 900 / rect.width;
      const scaleY = 600 / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      setNodes(prev => ({
        ...prev,
        [isDraggingNode]: { ...prev[isDraggingNode], _x: x, _y: y }
      }));
      return;
    }
    if (!isPanning) return;
    setGraphTransform(t => ({
      ...t,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }));
  };

  const handleSvgMouseUp = () => {
    setIsPanning(false);
    setIsDraggingNode(null);
  };

  const handleSvgWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setGraphTransform(t => ({
      ...t,
      scale: Math.max(0.3, Math.min(3, t.scale * delta))
    }));
  };

  // ─── Obsidian-style graph render ─────────────────────────
  const renderGraph = () => {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return null;

    // Collect edges
    const edges = [];
    nodeIds.forEach(nid => {
      const n = nodes[nid];
      if (n.childrenIds) {
        n.childrenIds.forEach(cid => {
          if (cid && nodes[cid] && graphPositions[nid] && graphPositions[cid]) {
            edges.push({ source: nid, target: cid });
          }
        });
      }
    });

    // Use _x/_y for manually dragged nodes, else force-layout positions
    const getPos = (nid) => {
      const n = nodes[nid];
      if (n?._x !== undefined) return { x: n._x, y: n._y };
      return graphPositions[nid] || { x: 450, y: 300 };
    };

    const W = 900, H = 600;
    const tx = graphTransform.x;
    const ty = graphTransform.y;
    const sc = graphTransform.scale;

    return (
      <div
        className="lotus-graph-view"
        style={{ userSelect: 'none', cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Obsidian-style dark background grid */}
        <svg
          ref={svgRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onWheel={handleSvgWheel}
        >
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowStrong">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Dot pattern background */}
            <pattern id="dotGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="0.8" fill="rgba(245,240,232,0.08)" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill="#0d0d0d" />
          <rect width={W} height={H} fill="url(#dotGrid)" />

          {/* Pan/zoom group */}
          <g transform={`translate(${tx},${ty}) scale(${sc})`} style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}>
            {/* Edges */}
            {edges.map((e, i) => {
              const s = getPos(e.source);
              const t = getPos(e.target);
              const isHighlighted = hoveredNodeId === e.source || hoveredNodeId === e.target;
              return (
                <line
                  key={i}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isHighlighted ? 'rgba(201,168,76,0.6)' : 'rgba(245,240,232,0.12)'}
                  strokeWidth={isHighlighted ? 1.5 : 1}
                  opacity={getEdgeOpacity(e.source, e.target)}
                  style={{ transition: 'opacity 0.2s, stroke 0.2s' }}
                />
              );
            })}

            {/* Nodes */}
            {nodeIds.map(nid => {
              if (!graphPositions[nid] && !nodes[nid]?._x) return null;
              const pos = getPos(nid);
              const r = getNodeRadius(nid);
              const color = getNodeColor(nid);
              const opacity = getNodeOpacity(nid);
              const isActive = nid === activeNodeId;
              const isHovered = nid === hoveredNodeId;
              const n = nodes[nid];
              const label = n.text || (n.parentId ? '' : 'Root');

              return (
                <g
                  key={nid}
                  className="graph-node-group"
                  style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}
                  onMouseEnter={() => setHoveredNodeId(nid)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    openSelectionModal(nid, null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    navigateTo(nid);
                    setViewMode('grid');
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingNode(nid);
                  }}
                >
                  {/* Glow ring for active/hovered */}
                  {(isActive || isHovered) && (
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={r + 8}
                      fill={color}
                      opacity={0.15}
                      filter="url(#glow)"
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={r}
                    fill={color}
                    stroke={isActive ? '#e8d5a0' : isHovered ? 'rgba(245,240,232,0.6)' : 'rgba(245,240,232,0.15)'}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    filter={isActive ? 'url(#glowStrong)' : isHovered ? 'url(#glow)' : undefined}
                    style={{ transition: 'all 0.2s' }}
                  />

                  {/* Inner dot for large nodes */}
                  {r >= 10 && (
                    <circle cx={pos.x} cy={pos.y} r={r * 0.35} fill="rgba(0,0,0,0.3)" />
                  )}

                  {/* Label */}
                  {(label || isHovered) && (
                    <text
                      x={pos.x} y={pos.y + r + 14}
                      textAnchor="middle"
                      fontSize={isHovered || isActive ? 11 : 10}
                      fill={isActive ? '#e8d5a0' : isHovered ? 'rgba(245,240,232,0.95)' : 'rgba(245,240,232,0.5)'}
                      fontFamily="DM Sans, sans-serif"
                      fontWeight={isActive || isHovered ? '500' : '400'}
                      style={{ transition: 'all 0.2s', pointerEvents: 'none' }}
                    >
                      {label.length > 18 ? label.slice(0, 16) + '…' : label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          display: 'flex', gap: 16, fontSize: 11,
          color: 'rgba(245,240,232,0.4)', alignItems: 'center',
          background: 'rgba(13,13,13,0.6)', padding: '8px 14px',
          borderRadius: 10, backdropFilter: 'blur(8px)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8d5a0', display: 'inline-block' }} />
            Root
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c9a84c', display: 'inline-block' }} />
            Active
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6b8c6b', display: 'inline-block' }} />
            Validated
          </span>
        </div>

        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          fontSize: 11, color: 'rgba(245,240,232,0.3)',
          background: 'rgba(13,13,13,0.6)', padding: '8px 14px',
          borderRadius: 10, backdropFilter: 'blur(8px)'
        }}>
          Scroll to zoom · Drag to pan · Click to inspect · Double-click to focus
        </div>

        {/* Zoom controls */}
        <div style={{
          position: 'absolute', top: 16, right: 16,
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {[
            { label: '+', action: () => setGraphTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) })) },
            { label: '⟲', action: () => setGraphTransform({ x: 0, y: 0, scale: 1 }) },
            { label: '−', action: () => setGraphTransform(t => ({ ...t, scale: Math.max(0.3, t.scale * 0.8) })) },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(245,240,232,0.1)',
                border: '1px solid rgba(245,240,232,0.15)',
                color: 'rgba(245,240,232,0.7)',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,240,232,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,240,232,0.1)'}
            >
              {label}
            </button>
          ))}
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
                fontSize: 28, fontFamily: 'Fraunces, serif',
                border: 'none', background: 'transparent',
                outline: 'none', width: '100%', maxWidth: 500, color: 'var(--ink)'
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
                            {activeNode.text || 'Core Idea...'}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const childId = activeNode.childrenIds[cell.childIndex];
                  const childNode = nodes[childId];
                  const hasExpanded = childNode?.childrenIds?.[0] !== null;
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
                      {status && <div className="status-badge">{status}</div>}
                      <div className="lotus-cell-inner">
                        <div className="cell-text" style={{ color: 'var(--ink)', opacity: childNode?.text ? 1 : 0.4 }}>
                          {childNode?.text || `Idea ${cell.childIndex + 1}...`}
                        </div>
                      </div>
                      {hasExpanded && <div className="lotus-expand-indicator" title="Has sub-ideas" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : renderGraph()}
        </div>
      </div>

      {/* Node Details Modal */}
      {selectedNodeId && nodes[selectedNodeId] && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedNodeId(null); }}
          style={{ zIndex: 1000 }}
        >
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
                            onClick={() => handleNodeUpdate(selectedNodeId, {
                              status: nodes[selectedNodeId].status === s ? null : s
                            })}
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
                      <span className={`tag tag-${nodes[selectedNodeId].status.toLowerCase() === 'validated' ? 'green'
                          : nodes[selectedNodeId].status.toLowerCase() === 'promising' ? 'gold'
                            : 'rust'
                        }`}>
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

            <div style={{
              borderTop: '1px solid rgba(13,13,13,0.08)',
              paddingTop: 20, display: 'flex',
              justifyContent: 'flex-end', gap: 12
            }}>
              <button className="btn btn-outline" onClick={() => setSelectedNodeId(null)}>
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