import { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { browserTimezone } from '../utils/dates';
import { getErrorMessage } from '../utils/errors';

const dismissKey = (deviceTz, accountTz) => `tz-banner-dismissed:${deviceTz}:${accountTz}`;

// Zones with different names can share a clock (Asia/Calcutta and Asia/Kolkata); don't ask about those
const sameClock = (a, b) => {
  try {
    const now = new Date();
    return now.toLocaleString('en-US', { timeZone: a }) === now.toLocaleString('en-US', { timeZone: b });
  } catch {
    return false;
  }
};

// Offers to switch the account's timezone when this device is in a different one (travel, a new laptop)
export default function TimezoneBanner() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const deviceTz = browserTimezone();
  const accountTz = user?.timezone || 'UTC';
  if (!user || !deviceTz || dismissed || sameClock(deviceTz, accountTz)) return null;
  try {
    if (localStorage.getItem(dismissKey(deviceTz, accountTz))) return null;
  } catch { /* storage unavailable */ }

  const keep = () => {
    try { localStorage.setItem(dismissKey(deviceTz, accountTz), '1'); } catch { /* storage unavailable */ }
    setDismissed(true);
  };

  const switchTz = async () => {
    setSaving(true);
    try {
      await API.put('/auth/profile', { timezone: deviceTz });
      await refreshUser(true);
      toast.success(`Timezone set to ${deviceTz}`);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update your timezone'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="status" style={{
      margin: 'clamp(16px, 4vw, 24px)',
      marginBottom: 0,
      padding: '14px 20px',
      background: 'var(--paper)',
      color: 'var(--ink)',
      border: '1px solid var(--gold)',
      borderRadius: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 200, fontSize: 14, lineHeight: 1.4 }}>
        This device is set to <strong>{deviceTz}</strong>, but your account uses <strong>{accountTz}</strong>.
        Days and reminders follow your account's timezone.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={switchTz} disabled={saving}>
          {saving ? 'Saving...' : `Use ${deviceTz}`}
        </button>
        <button className="btn btn-sm" onClick={keep} disabled={saving}>
          Keep {accountTz}
        </button>
      </div>
    </div>
  );
}
