const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { notifySurplusForInventory } = require('../services/surplusService');

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

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

const buildInventorySelect = () => `
  id,
  farm_id,
  product_id,
  quantity,
  date,
  is_surplus,
  low_stock_threshold,
  notes,
  products (
    id,
    name,
    type,
    unit
  )
`;

const getLatestInventoryByProduct = (rows) => {
  const latestMap = new Map();
  rows.forEach((row) => {
    if (!latestMap.has(row.product_id)) {
      latestMap.set(row.product_id, row);
    }
  });
  return Array.from(latestMap.values());
};

const buildLowStockList = (rows) => rows.filter((row) => {
  if (row.low_stock_threshold === null || row.low_stock_threshold === undefined) {
    return false;
  }
  return Number(row.quantity) <= Number(row.low_stock_threshold);
});

// Create or update inventory for a product/date (farmers only)
exports.upsertInventory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const {
      product_id,
      quantity,
      date,
      is_surplus,
      low_stock_threshold,
      notes
    } = req.body;

    const inventoryDate = normalizeDate(date) || new Date().toISOString().slice(0, 10);

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .eq('farm_id', farm.id)
      .single();

    if (!product) {
      return res.status(400).json({ error: 'Product not found for this farm' });
    }

    const parsedQuantity = Number(quantity);
    const parsedThreshold = low_stock_threshold === '' || low_stock_threshold === null || low_stock_threshold === undefined
      ? null
      : Number(low_stock_threshold);

    const payload = {
      farm_id: farm.id,
      product_id,
      quantity: parsedQuantity,
      date: inventoryDate,
      is_surplus: is_surplus === undefined ? false : is_surplus,
      low_stock_threshold: Number.isNaN(parsedThreshold) ? null : parsedThreshold,
      notes: notes || null
    };

    const { data: existing } = await supabase
      .from('inventory')
      .select('id, is_surplus')
      .eq('farm_id', farm.id)
      .eq('product_id', product_id)
      .eq('date', inventoryDate)
      .maybeSingle();

    const { data: inventory, error } = await supabase
      .from('inventory')
      .upsert([payload], { onConflict: 'farm_id,product_id,date' })
      .select(buildInventorySelect())
      .single();

    if (error) {
      console.error('Error updating inventory:', error);
      return res.status(500).json({ error: 'Failed to update inventory' });
    }

    try {
      if (inventory.is_surplus && !existing?.is_surplus) {
        await notifySurplusForInventory(inventory);
      }
    } catch (notifyError) {
      console.error('Surplus notification error:', notifyError.message);
    }

    res.json({
      message: 'Inventory updated successfully',
      inventory
    });
  } catch (error) {
    console.error('Upsert inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory for current farmer's farm
exports.getMyFarmInventory = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const requestedDate = normalizeDate(req.query.date);

    let query = supabase
      .from('inventory')
      .select(buildInventorySelect())
      .eq('farm_id', farm.id)
      .order('date', { ascending: false });

    if (requestedDate) {
      query = query.eq('date', requestedDate);
    }

    const { data: inventoryRows, error } = await query;

    if (error) {
      console.error('Error fetching inventory:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory' });
    }

    let inventory = inventoryRows || [];
    if (!requestedDate) {
      inventory = getLatestInventoryByProduct(inventory);
    }

    const lowStock = buildLowStockList(inventory);

    let missingProducts = [];
    if (requestedDate) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, type, unit')
        .eq('farm_id', farm.id)
        .order('name');

      const inventoryProductIds = new Set(inventory.map((row) => row.product_id));
      missingProducts = (products || []).filter((product) => !inventoryProductIds.has(product.id));
    }

    res.json({
      inventory,
      lowStock,
      missingProducts,
      date: requestedDate || null
    });
  } catch (error) {
    console.error('Get my farm inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get inventory by farm ID (owner only)
exports.getFarmInventory = async (req, res) => {
  try {
    const { farmId } = req.params;
    const requestedDate = normalizeDate(req.query.date);

    const { data: farm } = await supabase
      .from('farms')
      .select('id, farmer_id')
      .eq('id', farmId)
      .single();

    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    if (farm.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this inventory' });
    }

    let query = supabase
      .from('inventory')
      .select(buildInventorySelect())
      .eq('farm_id', farmId)
      .order('date', { ascending: false });

    if (requestedDate) {
      query = query.eq('date', requestedDate);
    }

    const { data: inventoryRows, error } = await query;

    if (error) {
      console.error('Error fetching inventory by farm:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory' });
    }

    let inventory = inventoryRows || [];
    if (!requestedDate) {
      inventory = getLatestInventoryByProduct(inventory);
    }

    const lowStock = buildLowStockList(inventory);

    res.json({
      inventory,
      lowStock,
      date: requestedDate || null
    });
  } catch (error) {
    console.error('Get farm inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Inventory history with optional filters
exports.getInventoryHistory = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { product_id, start_date, end_date } = req.query;
    const startDate = normalizeDate(start_date);
    const endDate = normalizeDate(end_date);

    let query = supabase
      .from('inventory')
      .select(buildInventorySelect())
      .eq('farm_id', farm.id)
      .order('date', { ascending: false });

    if (product_id) {
      query = query.eq('product_id', product_id);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error('Error fetching inventory history:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory history' });
    }

    res.json({
      history: history || []
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Low stock items for current farm
exports.getLowStock = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const requestedDate = normalizeDate(req.query.date);

    let query = supabase
      .from('inventory')
      .select(buildInventorySelect())
      .eq('farm_id', farm.id)
      .order('date', { ascending: false });

    if (requestedDate) {
      query = query.eq('date', requestedDate);
    }

    const { data: inventoryRows, error } = await query;

    if (error) {
      console.error('Error fetching low stock inventory:', error);
      return res.status(500).json({ error: 'Failed to fetch low stock items' });
    }

    let inventory = inventoryRows || [];
    if (!requestedDate) {
      inventory = getLatestInventoryByProduct(inventory);
    }

    const lowStock = buildLowStockList(inventory);

    res.json({
      lowStock,
      date: requestedDate || null
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
