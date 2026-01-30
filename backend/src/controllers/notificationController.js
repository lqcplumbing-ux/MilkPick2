const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { NOTIFICATION_CATEGORIES, getPreferences } = require('../services/notificationService');

// Get notifications for current user
exports.getMyNotifications = async (req, res) => {
  try {
    const { limit } = req.query;
    const pageSize = Math.min(Number(limit) || 50, 200);

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, category, recipient, subject, message, status, sent_at')
      .eq('user_id', req.user.id)
      .order('sent_at', { ascending: false })
      .limit(pageSize);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json({ notifications: notifications || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get notification preferences
exports.getPreferences = async (req, res) => {
  try {
    const prefs = await getPreferences(req.user.id);
    if (!prefs) {
      return res.status(404).json({ error: 'Preferences not found' });
    }
    res.json({ preferences: prefs });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    const fields = ['sms_enabled', 'email_enabled', ...NOTIFICATION_CATEGORIES];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = Boolean(req.body[field]);
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No preferences provided' });
    }

    await getPreferences(req.user.id);

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    res.json({ message: 'Preferences updated', preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
