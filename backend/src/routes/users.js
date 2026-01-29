const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile or this could be expanded for admin
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, phone, first_name, last_name, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only update their own profile
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { phone, first_name, last_name } = req.body;
    const updateData = {};

    if (phone !== undefined) updateData.phone = phone;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, role, phone, first_name, last_name, created_at, updated_at')
      .single();

    if (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
