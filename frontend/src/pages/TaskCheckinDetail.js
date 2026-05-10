import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import ConfirmModal from '../components/ui/ConfirmModal';

const CATEGORIES = [
  { id: 'priority', label: 'Priority', icon: '🎯', color: 'var(--rust)',
    questions: [
      { key: 'q1', text: 'Is this task truly necessary right now, or can it wait?' },
      { key: 'q2', text: 'Is there a higher-priority task I am ignoring by doing this?' },
      { key: 'q3', text: 'What happens if I stop this task entirely — what is the real cost?' },
      { key: 'q4', text: 'Was this task assigned or self-pulled? Does that change its priority?' },
    ]
  },
  { id: 'value', label: 'Value & Learning', icon: '💡', color: '#8b6bc4',
    questions: [
      { key: 'q5', text: 'What am I learning? Is the learning worth the time?' },
      { key: 'q6', text: 'Is this moving me closer to a meaningful outcome, or just keeping me busy?' },
      { key: 'q7', text: 'What is the best possible result if I finish this well?' },
      { key: 'q8', text: 'Is the output of this task something concrete and measurable?' },
    ]
  },
  { id: 'energy', label: 'Energy & Focus', icon: '⚡', color: 'var(--gold)',
    questions: [
      { key: 'q9', text: 'Am I in the right mental state to do this task well right now?' },
      { key: 'q10', text: 'Am I feeling resistance or flow? What is that telling me?' },
      { key: 'q11', text: 'Is this task draining me in a way that will hurt the rest of my day?' },
      { key: 'q12', text: 'Should I take a 5-minute break before continuing?' },
    ]
  },
  { id: 'career', label: 'Career & Goals', icon: '🚀', color: 'var(--sage)',
    questions: [
      { key: 'q13', text: 'Does completing this task help my career or personal growth?' },
      { key: 'q14', text: 'Is this aligned with what I said I want to focus on this week?' },
      { key: 'q15', text: 'Am I doing this because it matters, or because it feels safe?' },
    ]
  },
  { id: 'delegation', label: 'Delegation', icon: '🤝', color: '#e07b39',
    questions: [
      { key: 'q16', text: 'Can someone else do this better, faster, or just as well?' },
      { key: 'q17', text: 'Can this be automated or templated so I never repeat it?' },
      { key: 'q18', text: 'Am I the right person to be spending time on this right now?' },
    ]
  },
];

const VERDICTS = [
  { key: 'continue', label: 'Continue', icon: '✅', desc: 'Right use of my time. Keep going.', color: 'var(--sage)' },
  { key: 'pause', label: 'Pause & Switch', icon: '⏸️', desc: 'Higher-priority task needs attention.', color: 'var(--gold)' },
  { key: 'drop', label: 'Drop / Delegate', icon: '🗑️', desc: 'Not worth my time or better handled by someone else.', color: 'var(--rust)' },
];

const QUICK_QUESTIONS = [
  { key: 'quick_most_important', label: 'Most important thing right now?' },
  { key: 'quick_real_progress', label: 'Making real progress or going in circles?' },
  { key: 'quick_show_for_30', label: 'What to show for this in 30 minutes?' },
  { key: 'quick_energy_suited', label: 'Is my energy level suited to this task?' },
];

function MdTextarea({ value, onChange, placeholder, borderColor = 'var(--sage)', minHeight = 80 }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => setPreview(false)}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: !preview ? 'var(--ink)' : 'rgba(13,13,13,0.07)',
            color: !preview ? 'white' : 'rgba(13,13,13,0.5)', fontWeight: 600 }}>
          ✏️ Write
        </button>
        <button type="button" onClick={() => setPreview(true)} disabled={!value?.trim()}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: value?.trim() ? 'pointer' : 'not-allowed',
            background: preview ? 'var(--ink)' : 'rgba(13,13,13,0.07)',
            color: preview ? 'white' : 'rgba(13,13,13,0.5)', fontWeight: 600, opacity: value?.trim() ? 1 : 0.4 }}>
          👁 Preview
        </button>
        <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)', alignSelf: 'center', marginLeft: 4 }}>Markdown supported</span>
      </div>
      {preview ? (
        <div className="md-body" style={{ minHeight, padding: '10px 16px', background: 'rgba(13,13,13,0.02)',
          border: '1px solid rgba(13,13,13,0.08)', borderLeft: `3px solid ${borderColor}`,
          borderRadius: '0 10px 10px 0', fontSize: 13, lineHeight: 1.7 }}>
          <MarkdownRenderer content={value || '_Nothing written yet_'} />
        </div>
      ) : (
        <textarea className="form-textarea" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight, borderLeft: `3px solid ${borderColor}`, borderRadius: '0 10px 10px 0', paddingLeft: 16, resize: 'vertical' }} />
      )}
    </div>
  );
}

export default function TaskCheckinDetail() {
  const { checkinId } = useParams();
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('answers');
  const [confirm, setConfirm] = useState(null);

  // Edit verdict state
  const [verdictForm, setVerdictForm] = useState({ verdict: 'continue', verdict_reason: '', next_action: '' });
  const [savingVerdict, setSavingVerdict] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/checkins/${checkinId}`);
      setCheckin(res.data);
      setVerdictForm({
        verdict: res.data.verdict || 'continue',
        verdict_reason: res.data.verdict_reason || '',
        next_action: res.data.next_action || '',
      });
      setNotes(res.data.notes || []);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to load check-in'));
      navigate('/checkins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [checkinId]);

  const handleSaveVerdict = async () => {
    setSavingVerdict(true);
    try {
      await API.put(`/checkins/${checkinId}`, verdictForm);
      toast.success('Verdict updated!');
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to update'));
    } finally {
      setSavingVerdict(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const updatedNotes = [...notes, { text: newNoteText.trim(), added_at: new Date().toISOString() }];
      await API.put(`/checkins/${checkinId}`, { notes: updatedNotes });
      setNotes(updatedNotes);
      setNewNoteText('');
      toast.success('Note added');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to add note'));
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (idx) => {
    const updatedNotes = notes.filter((_, i) => i !== idx);
    try {
      await API.put(`/checkins/${checkinId}`, { notes: updatedNotes });
      setNotes(updatedNotes);
      toast.success('Note removed');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to remove note'));
    }
  };

  const handleDelete = () => {
    setConfirm({
      title: 'Delete Check-In?',
      message: 'This will permanently delete this check-in record. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await API.delete(`/checkins/${checkinId}`);
          toast.success('Check-in deleted');
          navigate('/checkins');
        } catch (e) {
          toast.error(getErrorMessage(e, 'Failed to delete'));
        }
      }
    });
  };

  if (loading) return (
    <div className="page-body">
      <div className="skeleton" style={{ height: 60, width: '40%', marginBottom: 32 }} />
      <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
    </div>
  );

  if (!checkin) return null;

  const verdict = VERDICTS.find(v => v.key === checkin.verdict) || VERDICTS[0];
  const currentVerdict = VERDICTS.find(v => v.key === verdictForm.verdict) || VERDICTS[0];

  // Build full answers list
  const fullAnswers = [];
  if (checkin.mode !== 'quick' && checkin.answers) {
    CATEGORIES.forEach(cat => {
      cat.questions.forEach(q => {
        const ans = checkin.answers[q.key];
        if (ans?.trim()) fullAnswers.push({ cat, q, ans });
      });
    });
  }
  const quickAnswers = QUICK_QUESTIONS.map(q => ({ ...q, ans: checkin[q.key] })).filter(q => q.ans?.trim());

  const TABS = [
    { id: 'answers', label: 'Answers', icon: '📝' },
    { id: 'verdict', label: 'Verdict', icon: verdict.icon },
    { id: 'notes', label: `Notes${notes.length ? ` (${notes.length})` : ''}`, icon: '📌' },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/checkins')}
            style={{ color: 'rgba(13,13,13,0.4)', padding: '4px 8px' }}>
            ← Task Check-Ins
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 28, marginBottom: 4 }}>{checkin.task_name}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: verdict.color, color: 'white', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>
                {verdict.icon} {verdict.label}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)' }}>
                Check-in #{checkin.check_in_number} · {checkin.mode === 'quick' ? '⚡ Quick' : '📋 Full'} · {checkin.created_at?.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(13,13,13,0.06)', marginBottom: 28 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 4px', fontSize: 15, fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--ink)' : 'rgba(13,13,13,0.4)',
                position: 'relative', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
              }}>
              <span>{tab.icon}</span> {tab.label}
              {activeTab === tab.id && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--sage)', borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Answers ── */}
        {activeTab === 'answers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>

            {/* Verdict summary card */}
            <div style={{ padding: '20px 24px', borderRadius: 16, border: `2px solid ${verdict.color}`, background: `${verdict.color}0d`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28 }}>{verdict.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: verdict.color, fontSize: 16 }}>{verdict.label}</div>
                {checkin.verdict_reason && <div style={{ fontSize: 13, lineHeight: 1.65, marginTop: 6, color: 'var(--ink)' }}><MarkdownRenderer content={checkin.verdict_reason} /></div>}
                {checkin.next_action && (
                  <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.55)', marginTop: 8, borderTop: '1px solid rgba(13,13,13,0.07)', paddingTop: 8 }}>
                    <strong>Next action:</strong> {checkin.next_action}
                  </div>
                )}
              </div>
            </div>

            {/* Full mode answers */}
            {checkin.mode !== 'quick' && fullAnswers.length > 0 && CATEGORIES.map(cat => {
              const catAnswers = fullAnswers.filter(a => a.cat.id === cat.id);
              if (!catAnswers.length) return null;
              return (
                <div key={cat.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 20, borderRadius: 2, background: cat.color }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: cat.color }}>{cat.icon} {cat.label}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 14 }}>
                    {catAnswers.map(({ q, ans }) => (
                      <div key={q.key} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', borderLeft: `3px solid ${cat.color}`, boxShadow: '0 2px 8px rgba(13,13,13,0.04)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.45)', marginBottom: 8, lineHeight: 1.4 }}>{q.text}</div>
                        <div className="md-body" style={{ fontSize: 13, lineHeight: 1.7 }}><MarkdownRenderer content={ans} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Quick mode answers */}
            {checkin.mode === 'quick' && quickAnswers.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: 'var(--gold)' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold)' }}>⚡ Quick Check-In Answers</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 14 }}>
                  {quickAnswers.map(q => (
                    <div key={q.key} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', borderLeft: '3px solid var(--gold)', boxShadow: '0 2px 8px rgba(13,13,13,0.04)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.45)', marginBottom: 8 }}>{q.label}</div>
                      <div className="md-body" style={{ fontSize: 13, lineHeight: 1.7 }}><MarkdownRenderer content={q.ans} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom questions */}
            {checkin.custom_questions?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: '#8b6bc4' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#8b6bc4' }}>✦ Custom Questions</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 14 }}>
                  {checkin.custom_questions.map((cq, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', borderLeft: '3px solid #8b6bc4', boxShadow: '0 2px 8px rgba(13,13,13,0.04)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.45)', marginBottom: 8 }}>{cq.text}</div>
                      {cq.answer?.trim()
                        ? <div className="md-body" style={{ fontSize: 13, lineHeight: 1.7 }}><MarkdownRenderer content={cq.answer} /></div>
                        : <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.3)', fontStyle: 'italic' }}>No answer recorded</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fullAnswers.length === 0 && quickAnswers.length === 0 && !checkin.custom_questions?.length && (
              <div className="empty-state"><div className="empty-icon">📝</div><h3>No answers recorded</h3><p>This check-in was saved without any written answers.</p></div>
            )}
          </div>
        )}

        {/* ── Tab: Verdict (editable) ── */}
        {activeTab === 'verdict' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'white', borderRadius: 20, padding: '28px 32px', border: '1px solid rgba(13,13,13,0.07)', boxShadow: '0 4px 20px rgba(13,13,13,0.04)' }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 6 }}>Change Verdict</h3>
              <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 24 }}>Update your decision now that the task is complete or you have more context.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {VERDICTS.map(v => (
                  <div key={v.key} onClick={() => setVerdictForm(f => ({ ...f, verdict: v.key }))}
                    style={{
                      padding: '16px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      border: `2px solid ${verdictForm.verdict === v.key ? v.color : 'rgba(13,13,13,0.08)'}`,
                      background: verdictForm.verdict === v.key ? `${v.color}10` : 'white',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                    <span style={{ fontSize: 24 }}>{v.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: verdictForm.verdict === v.key ? v.color : 'var(--ink)' }}>{v.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', marginTop: 2 }}>{v.desc}</div>
                    </div>
                    {verdictForm.verdict === v.key && <span style={{ fontWeight: 700, color: v.color }}>✓</span>}
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Reason for this verdict</label>
                <MdTextarea value={verdictForm.verdict_reason} onChange={val => setVerdictForm(f => ({ ...f, verdict_reason: val }))}
                  placeholder="Why this verdict? What did you learn?" borderColor={currentVerdict.color} minHeight={100} />
              </div>
              <div className="form-group">
                <label className="form-label">Next action to take</label>
                <MdTextarea value={verdictForm.next_action} onChange={val => setVerdictForm(f => ({ ...f, next_action: val }))}
                  placeholder="The very next concrete step..." borderColor="rgba(13,13,13,0.2)" minHeight={70} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-outline" onClick={() => setVerdictForm({ verdict: checkin.verdict, verdict_reason: checkin.verdict_reason || '', next_action: checkin.next_action || '' })}>
                  Reset
                </button>
                <button className="btn btn-primary" style={{ flex: 1, borderRadius: 30 }} onClick={handleSaveVerdict} disabled={savingVerdict}>
                  {savingVerdict ? 'Saving...' : '✦ Save Verdict'}
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(196,98,58,0.2)', background: 'rgba(196,98,58,0.03)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: 'var(--rust)', marginBottom: 8 }}>Danger Zone</div>
              <div style={{ fontSize: 13, color: 'rgba(13,13,13,0.5)', marginBottom: 16 }}>Permanently delete this check-in record.</div>
              <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--rust)' }}>🗑 Delete This Check-In</button>
            </div>
          </div>
        )}

        {/* ── Tab: Notes ── */}
        {activeTab === 'notes' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Add note */}
            <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(13,13,13,0.07)', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📌 Add a Note</div>
              <MdTextarea value={newNoteText} onChange={setNewNoteText}
                placeholder="Add a follow-up note, reflection, or observation after completing the task... (markdown supported)"
                borderColor="var(--sage)" minHeight={100} />
              <button className="btn btn-primary" style={{ marginTop: 12, borderRadius: 30 }} onClick={handleAddNote} disabled={addingNote || !newNoteText.trim()}>
                {addingNote ? 'Adding...' : '+ Add Note'}
              </button>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📌</div>
                <h3>No notes yet</h3>
                <p>Add follow-up thoughts after completing or reviewing the task.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notes.map((note, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(13,13,13,0.07)', borderLeft: '3px solid var(--sage)', boxShadow: '0 2px 8px rgba(13,13,13,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', fontWeight: 500 }}>
                        📌 Note {i + 1} · {note.added_at?.slice(0, 10)}
                      </div>
                      <button onClick={() => handleDeleteNote(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)', fontSize: 14, padding: '0 4px' }}>✕</button>
                    </div>
                    <div className="md-body" style={{ fontSize: 13, lineHeight: 1.7 }}><MarkdownRenderer content={note.text} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
