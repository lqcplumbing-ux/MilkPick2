import React, { useEffect, useState } from 'react';
import { notificationAPI } from '../services/api';
import './NotificationCenter.css';

const categoryLabels = {
  order_confirmation: 'Order confirmations',
  pickup_reminder: 'Pickup reminders',
  late_pickup: 'Late pickup alerts',
  schedule_change: 'Schedule changes',
  payment_confirmation: 'Payment confirmations',
  weekly_summary: 'Weekly summaries',
  surplus_alert: 'Surplus alerts'
};

const NotificationCenter = () => {
  const [preferences, setPreferences] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [prefResponse, historyResponse] = await Promise.all([
        notificationAPI.getPreferences(),
        notificationAPI.getNotifications({ limit: 40 })
      ]);
      setPreferences(prefResponse.data.preferences);
      setNotifications(historyResponse.data.notifications || []);
    } catch (err) {
      console.error('Load notification data error:', err);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = (field) => {
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await notificationAPI.updatePreferences(preferences);
      setMessage('Preferences updated.');
    } catch (err) {
      console.error('Update preferences error:', err);
      setError('Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading notifications...</div>;
  }

  if (!preferences) {
    return <div className="error-message">Notification preferences not available.</div>;
  }

  return (
    <div className="notification-center">
      <div className="section-header">
        <div>
          <h2>Notifications</h2>
          <p className="section-subtitle">Choose how you want to hear from MilkPick.</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="preference-panel">
        <div className="preference-row">
          <label>
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={() => handleToggle('email_enabled')}
            />
            Email notifications
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.sms_enabled}
              onChange={() => handleToggle('sms_enabled')}
            />
            SMS notifications
          </label>
        </div>

        <div className="preference-grid">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <label key={key} className="preference-item">
              <input
                type="checkbox"
                checked={Boolean(preferences[key])}
                onChange={() => handleToggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="notification-history">
        <h3>Recent Notifications</h3>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="history-list">
            {notifications.map((note) => (
              <div key={note.id} className="history-row">
                <div>
                  <p className="history-title">{note.subject || categoryLabels[note.category] || note.category}</p>
                  <p className="history-meta">{note.type} • {note.category} • {note.recipient}</p>
                </div>
                <div className="history-status">
                  <span className={`status-pill ${note.status}`}>{note.status}</span>
                  <span className="history-date">
                    {note.sent_at ? new Date(note.sent_at).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
