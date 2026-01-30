const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const {
  getOptIns,
  upsertOptIn,
  listAvailableSurplus,
  claimSurplus,
  getFarmSurplusHistory,
  getCustomerHistory
} = require('../services/surplusService');

const getFarmForFarmer = async (farmerId) => {
  const { data: farm, error } = await supabase
    .from('farms')
    .select('id, name')
    .eq('farmer_id', farmerId)
    .single();

  if (error || !farm) {
    return null;
  }

  return farm;
};

// Customer opt-in/out
exports.optIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farm_id, product_id, opted_in } = req.body;

    const { data: farm } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farm_id)
      .single();

    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .eq('farm_id', farm_id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found for farm' });
    }

    const record = await upsertOptIn({
      customerId: req.user.id,
      farmId: farm_id,
      productId: product_id,
      optedIn: Boolean(opted_in)
    });

    res.json({ message: 'Opt-in updated', opt_in: record });
  } catch (error) {
    console.error('Surplus opt-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Customer opt-ins
exports.getMyOptIns = async (req, res) => {
  try {
    const optIns = await getOptIns(req.user.id);
    res.json({ opt_ins: optIns });
  } catch (error) {
    console.error('Get opt-ins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Customer available surplus list
exports.getAvailable = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { date } = req.query;
    const inventory = await listAvailableSurplus(req.user.id, date || today);
    res.json({ surplus: inventory });
  } catch (error) {
    console.error('Get surplus availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Customer claim surplus
exports.claim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { inventory_id } = req.body;
    const result = await claimSurplus({ customerId: req.user.id, inventoryId: inventory_id });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Surplus claimed', inventory: result.inventory });
  } catch (error) {
    console.error('Surplus claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Customer surplus history
exports.getMyHistory = async (req, res) => {
  try {
    const history = await getCustomerHistory(req.user.id);
    res.json({ history });
  } catch (error) {
    console.error('Surplus history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Farmer surplus history
exports.getFarmHistory = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const history = await getFarmSurplusHistory(farm.id);
    res.json({ history });
  } catch (error) {
    console.error('Farm surplus history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
