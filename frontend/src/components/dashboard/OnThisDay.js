import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import API from '../../utils/api';

const yearsAgoLabel = (n) => (n === 1 ? '1 year ago' : `${n} years ago`);

// Logs written on today's date in earlier years. Renders nothing until there is one to show.
export default function OnThisDay() {
  const navigate = useNavigate();
  const [memories, setMemories] = useState([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    API.get('/dashboard/on-this-day')
      .then(res => setMemories(res.data))
      .catch(() => { });
  }, []);

  if (memories.length === 0) return null;
  const memory = memories[Math.min(selected, memories.length - 1)];
  const hiddenEntries = memory.entry_count - memory.entries.length;

  return (
    <div className="card on-this-day" style={{ marginBottom: 28 }}>
      <div className="section-title" style={{ marginBottom: 6 }}>
        <span>On this day ✦</span>
        {memories.length > 1 && (
          <div className="on-this-day-years" role="tablist" aria-label="Pick a year">
            {memories.map((m, i) => (
              <button
                key={m.date}
                role="tab"
                aria-selected={m === memory}
                className={`btn btn-sm ${m === memory ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelected(i)}
              >
                {yearsAgoLabel(m.years_ago)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="on-this-day-meta">
        {memories.length === 1 && <>{yearsAgoLabel(memory.years_ago)} · </>}
        {format(parseISO(memory.date), 'EEEE, MMMM d, yyyy')}
        {memory.overall_rating != null && <> · Day rated {memory.overall_rating}/10</>}
      </div>

      {memory.highlight && <blockquote className="on-this-day-highlight">{memory.highlight}</blockquote>}

      {memory.entries.length > 0 && (
        <ul className="on-this-day-entries">
          {memory.entries.map((e, i) => (
            <li key={i}>
              <span
                className="on-this-day-cat"
                style={{ borderColor: e.category?.color || '#888' }}
                title={e.category?.name || 'General'}
              >
                {e.category?.icon || '📁'}
              </span>
              <span>{e.text}</span>
            </li>
          ))}
          {hiddenEntries > 0 && (
            <li className="on-this-day-more">+{hiddenEntries} more {hiddenEntries === 1 ? 'entry' : 'entries'}</li>
          )}
        </ul>
      )}

      {memory.gratitude.length > 0 && (
        <div className="on-this-day-gratitude">🙏 Grateful for: {memory.gratitude.join(' · ')}</div>
      )}

      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/log?date=${memory.date}`)}>
        Open that day →
      </button>
    </div>
  );
}
