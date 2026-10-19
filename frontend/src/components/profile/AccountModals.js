import { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export function ChangePasswordModal({ onClose }) {
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm) {
      return toast.error('Please fill in all password fields');
    }
    if (pwForm.new_password.length < 6) {
      return toast.error('New password must be at least 6 characters long');
    }
    if (pwForm.new_password !== pwForm.confirm) {
      return toast.error('New passwords do not match');
    }
    setSaving(true);
    try {
      await API.put('/auth/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully!');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to change password'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Change Password</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input type="password" className="form-input" value={pwForm.current_password}
            onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} placeholder="••••••••" maxLength={128} />
        </div>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input type="password" className="form-input" value={pwForm.new_password}
            onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="At least 6 characters" maxLength={128} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input type="password" className="form-input" value={pwForm.confirm}
            onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Repeat new password" maxLength={128} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChangeEmailModal({ onClose, onChanged }) {
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const handleChangeEmail = async () => {
    if (!emailForm.new_email || !emailForm.password) return toast.error('Fill all fields');
    setSaving(true);
    try {
      await API.put('/auth/email', { new_email: emailForm.new_email, password: emailForm.password });
      await onChanged();
      toast.success('Email updated successfully!');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to update email'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Change Email</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">New Email Address</label>
          <input type="email" className="form-input" value={emailForm.new_email}
            onChange={e => setEmailForm({ ...emailForm, new_email: e.target.value })} placeholder="new@example.com" maxLength={200} />
        </div>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input type="password" className="form-input" value={emailForm.password}
            onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} placeholder="••••••••" maxLength={128} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleChangeEmail} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Changing...' : 'Change Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
