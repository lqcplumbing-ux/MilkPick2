const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');

// Create a new farm (farmers only)
exports.createFarm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, address, city, state, zip_code, phone, email } = req.body;

    // Check if farmer already has a farm
    const { data: existingFarm } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', req.user.id)
      .single();

    if (existingFarm) {
      return res.status(400).json({ error: 'You already have a farm registered' });
    }

    const { data: farm, error } = await supabase
      .from('farms')
      .insert([{
        farmer_id: req.user.id,
        name,
        description,
        address,
        city,
        state,
        zip_code,
        phone,
        email
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating farm:', error);
      return res.status(500).json({ error: 'Failed to create farm' });
    }

    res.status(201).json({
      message: 'Farm created successfully',
      farm
    });
  } catch (error) {
    console.error('Create farm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all farms (public)
exports.getAllFarms = async (req, res) => {
  try {
    const { data: farms, error } = await supabase
      .from('farms')
      .select(`
        id,
        name,
        description,
        city,
        state,
        active,
        created_at
      `)
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching farms:', error);
      return res.status(500).json({ error: 'Failed to fetch farms' });
    }

    res.json({ farms });
  } catch (error) {
    console.error('Get all farms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get farm by ID (public)
exports.getFarmById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: farm, error } = await supabase
      .from('farms')
      .select(`
        *,
        products (
          id,
          name,
          description,
          price,
          type,
          unit,
          available,
          image_url
        )
      `)
      .eq('id', id)
      .single();

    if (error || !farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    res.json({ farm });
  } catch (error) {
    console.error('Get farm by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current farmer's farm
exports.getMyFarm = async (req, res) => {
  try {
    const { data: farm, error } = await supabase
      .from('farms')
      .select(`
        *,
        products (
          id,
          name,
          description,
          price,
          type,
          unit,
          available,
          image_url,
          created_at
        )
      `)
      .eq('farmer_id', req.user.id)
      .single();

    if (error || !farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    res.json({ farm });
  } catch (error) {
    console.error('Get my farm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update farm (owner only)
exports.updateFarm = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existingFarm } = await supabase
      .from('farms')
      .select('farmer_id')
      .eq('id', id)
      .single();

    if (!existingFarm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    if (existingFarm.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this farm' });
    }

    const { name, description, address, city, state, zip_code, phone, email, active } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip_code !== undefined) updateData.zip_code = zip_code;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (active !== undefined) updateData.active = active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: farm, error } = await supabase
      .from('farms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating farm:', error);
      return res.status(500).json({ error: 'Failed to update farm' });
    }

    res.json({
      message: 'Farm updated successfully',
      farm
    });
  } catch (error) {
    console.error('Update farm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete farm (owner only)
exports.deleteFarm = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existingFarm } = await supabase
      .from('farms')
      .select('farmer_id')
      .eq('id', id)
      .single();

    if (!existingFarm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    if (existingFarm.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this farm' });
    }

    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting farm:', error);
      return res.status(500).json({ error: 'Failed to delete farm' });
    }

    res.json({ message: 'Farm deleted successfully' });
  } catch (error) {
    console.error('Delete farm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
