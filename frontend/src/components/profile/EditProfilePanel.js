import { useState } from 'react';
import toast from 'react-hot-toast';
import { browserTimezone, timezoneOptions } from '../../utils/dates';

const MAX_THEME_ITEMS = 24; // matches the backend limit in ProfileUpdateModel
const AVATAR_OPTIONS = ['🌱', '🔥', '💎', '🦁', '🦋', '🌊', '⚡', '🎯', '🌙', '☀️', '🏔️', '🌿'];
export const DEFAULT_CATEGORY_COLORS = ['#6b8c6b', '#c9a84c', '#c4623a', '#5b8ba8', '#8b6bc4', '#c46b8b', '#6bc4b8', '#a8895b'];
export const DEFAULT_CATEGORY_ICONS = ['🧠', '💼', '❤️', '🤝', '💪', '🎯', '📚', '🌿', '💰', '🎨', '🙏', '⚡'];

// Slide-in panel for editing name, bio, avatar, timezone, notifications and the category theme
export default function EditProfilePanel({ form, setForm, saving, onSave, onClose }) {
  const [newColorInput, setNewColorInput] = useState('#6b8c6b');
  const [newIconInput, setNewIconInput] = useState('');
  const deviceTz = browserTimezone();

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(13,13,13,0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        height: '100%',
        background: 'white',
        boxShadow: '-8px 0 48px rgba(13,13,13,0.15)',
        overflowY: 'auto',
        animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Panel header */}
        <div className="profile-edit-panel-header" style={{
          padding: '28px 32px 20px',
          borderBottom: '1px solid rgba(13,13,13,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <div>
            <h3 style={{ fontSize: 22, marginBottom: 2 }}>Edit Profile</h3>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.45)' }}>Update your identity & preferences</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: 'var(--mist)', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(13,13,13,0.5)', transition: 'all 0.2s',
            }}
          >✕</button>
        </div>

        {/* Panel body */}
        <div className="profile-edit-panel-body" style={{ padding: '28px 32px', flex: 1 }}>
          <div className="form-group">
            <label className="form-label">Choose Avatar</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {AVATAR_OPTIONS.map(a => (
                <button key={a} onClick={() => setForm({ ...form, avatar_emoji: a })}
                  style={{
                    width: 48, height: 48, borderRadius: 12, fontSize: 26, cursor: 'pointer',
                    border: `2px solid ${form.avatar_emoji === a ? 'var(--sage)' : 'rgba(13,13,13,0.1)'}`,
                    background: form.avatar_emoji === a ? 'rgba(107,140,107,0.1)' : 'white',
                    transition: 'all 0.15s',
                    transform: form.avatar_emoji === a ? 'scale(1.1)' : 'scale(1)',
                  }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input maxLength={100} className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            <div style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', textAlign: 'right', marginTop: 4 }}>{form.name.length}/100</div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio (optional)</label>
            <textarea maxLength={500} className="form-textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
              placeholder="A short note about yourself or your growth intentions..." style={{ minHeight: 90 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>
              <span>Markdown supported</span>
              <span>{form.bio.length}/500</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-timezone">Timezone</label>
            <select id="profile-timezone" className="form-select" value={form.timezone}
              onChange={e => setForm({ ...form, timezone: e.target.value })}>
              {timezoneOptions(form.timezone, deviceTz).map(tz => (
                <option key={tz} value={tz}>{tz === deviceTz ? `${tz} (this device)` : tz}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4 }}>
              Decides when your day starts for logs, streaks and reminders.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.email_notifications}
                onChange={e => setForm({ ...form, email_notifications: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--sage)' }} />
              <span>Enable daily email nudges & reminders</span>
            </label>
            <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', marginTop: 4, marginLeft: 26 }}>
              If enabled, we'll send a gentle nudge if you haven't logged your growth by evening.
            </p>
          </div>

          {/* Design Tokens & Theme Customization */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(13,13,13,0.07)' }}>
            <h4 style={{ fontFamily: 'Fraunces', fontSize: 18, marginBottom: 4, color: 'var(--sage)' }}>Design Tokens & Theme</h4>
            <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', marginBottom: 20 }}>
              Customize the colors and emoji icons available across your category choices.
            </p>

            {/* Color Palette Builder */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'block' }}>
                Color Palette ({form.category_colors?.length || 0})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {form.category_colors?.map((color, index) => (
                  <div
                    key={`${color}-${index}`}
                    className="color-chip"
                    style={{
                      position: 'relative',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: color,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Click to remove color"
                    onClick={() => {
                      if (form.category_colors.length === 1) {
                        return toast.error('Keep at least one color');
                      }
                      const updated = form.category_colors.filter((_, i) => i !== index);
                      setForm({ ...form, category_colors: updated });
                    }}
                  >
                    <span style={{
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                    }}
                    className="color-chip-delete"
                    >✕</span>
                  </div>
                ))}
              </div>
              
              {/* Add Color Selector row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid rgba(13,13,13,0.15)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'white',
                  flexShrink: 0
                }}>
                  <input
                    type="color"
                    value={newColorInput}
                    onChange={e => setNewColorInput(e.target.value)}
                    style={{
                      position: 'absolute',
                      width: '150%',
                      height: '150%',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, margin: 0, fontSize: 13, textTransform: 'uppercase', fontFamily: 'monospace' }}
                  value={newColorInput}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('#') && val.length <= 7) {
                      setNewColorInput(val);
                    } else if (!val.startsWith('#') && val.length <= 6) {
                      setNewColorInput('#' + val);
                    }
                  }}
                  placeholder="#HEXCODE"
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ height: 38, whiteSpace: 'nowrap', borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 600 }}
                  onClick={() => {
                    if (!/^#[0-9A-Fa-f]{6}$/.test(newColorInput)) {
                      return toast.error('Please enter a valid 6-character hex color (e.g. #FF00FF)');
                    }
                    if (form.category_colors.length >= MAX_THEME_ITEMS) {
                      return toast.error(`Your palette can hold up to ${MAX_THEME_ITEMS} colors`);
                    }
                    if (form.category_colors.includes(newColorInput)) {
                      return toast.error('This color is already in your palette');
                    }
                    setForm({
                      ...form,
                      category_colors: [...form.category_colors, newColorInput]
                    });
                    toast.success(`Color ${newColorInput} added!`);
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Category Icon Manager */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'block' }}>
                Emoji Icons ({form.category_icons?.length || 0})
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
                marginBottom: 12,
                background: 'var(--mist)',
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(13,13,13,0.05)'
              }}>
                {form.category_icons?.map((icon, index) => (
                  <div
                    key={`${icon}-${index}`}
                    className="icon-chip"
                    style={{
                      position: 'relative',
                      height: 38,
                      background: 'white',
                      border: '1px solid rgba(13,13,13,0.06)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      cursor: 'pointer',
                    }}
                    title="Click to remove icon"
                    onClick={() => {
                      if (form.category_icons.length === 1) {
                        return toast.error('Keep at least one icon');
                      }
                      const updated = form.category_icons.filter((_, i) => i !== index);
                      setForm({ ...form, category_icons: updated });
                    }}
                  >
                    {icon}
                    <span style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'var(--rust)',
                      color: 'white',
                      fontSize: 9,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                    className="icon-delete-badge"
                    >✕</span>
                  </div>
                ))}
              </div>

              {/* Add Icon Row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, margin: 0, fontSize: 13 }}
                  value={newIconInput}
                  onChange={e => setNewIconInput(e.target.value)}
                  placeholder="Paste an emoji here..."
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ height: 38, whiteSpace: 'nowrap', borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 600 }}
                  onClick={() => {
                    const emoji = newIconInput.trim();
                    if (!emoji) return toast.error('Please input a valid emoji or character');
                    if (emoji.length > 8) {
                      return toast.error('Icon should be a single emoji or short symbol');
                    }
                    if (form.category_icons.length >= MAX_THEME_ITEMS) {
                      return toast.error(`You can keep up to ${MAX_THEME_ITEMS} icons`);
                    }
                    if (form.category_icons.includes(emoji)) {
                      return toast.error('This icon is already in your list');
                    }
                    setForm({
                      ...form,
                      category_icons: [...form.category_icons, emoji]
                    });
                    setNewIconInput('');
                    toast.success(`Icon ${emoji} added!`);
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Reset to Defaults */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{
                width: '100%',
                borderColor: 'var(--gold)',
                color: 'var(--gold)',
                background: 'rgba(201, 168, 76, 0.05)',
                fontWeight: 600,
                height: 38,
                borderRadius: 10,
                marginTop: 8
              }}
              onClick={() => {
                setForm({
                  ...form,
                  category_colors: DEFAULT_CATEGORY_COLORS,
                  category_icons: DEFAULT_CATEGORY_ICONS
                });
                toast.success('Reset colors and icons to default sets! Save changes to persist.');
              }}
            >
              ↺ Reset Theme Defaults
            </button>
          </div>
        </div>

        {/* Panel footer */}
        <div className="profile-edit-panel-footer" style={{
          padding: '20px 32px',
          borderTop: '1px solid rgba(13,13,13,0.07)',
          display: 'flex', gap: 12,
          position: 'sticky', bottom: 0, background: 'white',
        }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
