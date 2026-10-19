import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

// ⌘K / Ctrl+K: jump to a page, or search entries across every module (GET /search)
export default function CommandPalette({ pages, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim();

  useEffect(() => {
    setFailed(false);
    if (q.length < MIN_QUERY) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      API.get('/search', { params: { q } })
        .then(res => { if (!cancelled) setEntries(res.data.results); })
        .catch(() => { if (!cancelled) { setEntries([]); setFailed(true); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  const lower = q.toLowerCase();
  const pageItems = pages
    .filter(p => !lower || p.label.toLowerCase().includes(lower))
    .map(p => ({ key: `page:${p.to}`, group: 'Pages', icon: p.icon, title: p.label, link: p.to }));
  const entryItems = entries.map(r => ({
    key: `${r.type}:${r.id}`, group: r.label, title: r.title, snippet: r.snippet, date: r.date, link: r.link,
  }));
  const items = [...pageItems, ...entryItems];

  useEffect(() => { setActive(0); }, [q, entries]);

  // Keep the highlighted row in view while arrowing through a long list
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const open = (item) => {
    onClose();
    navigate(item.link);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[active]) open(items[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let status = null;
  if (q.length >= MIN_QUERY && !loading) {
    if (failed) status = 'Search failed. Try again.';
    else if (items.length === 0) status = `No results for "${q}"`;
  } else if (q.length > 0 && q.length < MIN_QUERY && pageItems.length === 0) {
    status = 'Keep typing to search your entries…';
  }

  return (
    <div className="cmdk-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search">
        <div className="cmdk-input-row">
          <span className="cmdk-input-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search entries or jump to a page…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={100}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={items[active] ? `cmdk-item-${active}` : undefined}
          />
          {loading && <span className="cmdk-spinner" aria-label="Searching" />}
          <kbd className="cmdk-kbd">Esc</kbd>
        </div>

        <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {items.map((item, i) => (
            <div key={item.key}>
              {(i === 0 || items[i - 1].group !== item.group) && (
                <div className="cmdk-group">{item.group}</div>
              )}
              <div
                id={`cmdk-item-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                className={`cmdk-item ${i === active ? 'active' : ''}`}
                onMouseMove={() => setActive(i)}
                onClick={() => open(item)}
              >
                {item.icon && <span className="cmdk-item-icon">{item.icon}</span>}
                <div className="cmdk-item-text">
                  <div className="cmdk-item-title">{item.title}</div>
                  {item.snippet && <div className="cmdk-item-snippet">{item.snippet}</div>}
                </div>
                {item.date && <span className="cmdk-item-date">{item.date}</span>}
              </div>
            </div>
          ))}
          {status && <div className="cmdk-status">{status}</div>}
        </div>

        <div className="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
