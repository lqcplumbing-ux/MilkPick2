const { validationResult } = require('express-validator');
const path = require('path');
const supabase = require('../config/supabase');

// Create a new product (farmers only)
exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get farmer's farm
    const { data: farm } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', req.user.id)
      .single();

    if (!farm) {
      return res.status(400).json({ error: 'Please create a farm first before adding products' });
    }

    const { name, description, price, type, unit, available, image_url } = req.body;

    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        farm_id: farm.id,
        name,
        description,
        price,
        type,
        unit: unit || 'gallon',
        available: available !== undefined ? available : true,
        image_url
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all products (with optional filters)
exports.getAllProducts = async (req, res) => {
  try {
    const { farm_id, type, available } = req.query;

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        type,
        unit,
        available,
        image_url,
        farm_id,
        farms (
          id,
          name,
          city,
          state
        )
      `)
      .order('name');

    if (farm_id) query = query.eq('farm_id', farm_id);
    if (type) query = query.eq('type', type);
    if (available !== undefined) query = query.eq('available', available === 'true');

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        farms (
          id,
          name,
          description,
          city,
          state,
          phone,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get products by farm
exports.getProductsByFarm = async (req, res) => {
  try {
    const { farmId } = req.params;

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('farm_id', farmId)
      .order('type')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get products by farm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get my products (farmer's products)
exports.getMyProducts = async (req, res) => {
  try {
    // Get farmer's farm
    const { data: farm } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', req.user.id)
      .single();

    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('farm_id', farm.id)
      .order('type')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update product (owner only)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product and verify ownership
    const { data: product } = await supabase
      .from('products')
      .select('farm_id, farms!inner(farmer_id)')
      .eq('id', id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farms.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const { name, description, price, type, unit, available, image_url } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (type !== undefined) updateData.type = type;
    if (unit !== undefined) updateData.unit = unit;
    if (available !== undefined) updateData.available = available;
    if (image_url !== undefined) updateData.image_url = image_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete product (owner only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product and verify ownership
    const { data: product } = await supabase
      .from('products')
      .select('farm_id, farms!inner(farmer_id)')
      .eq('id', id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farms.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Toggle product availability
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product and verify ownership
    const { data: product } = await supabase
      .from('products')
      .select('available, farm_id, farms!inner(farmer_id)')
      .eq('id', id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farms.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update({ available: !product.available })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling availability:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    res.json({
      message: `Product is now ${updatedProduct.available ? 'available' : 'unavailable'}`,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Upload product image (owner only)
exports.uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Get product and verify ownership
    const { data: product } = await supabase
      .from('products')
      .select('id, image_url, farms!inner(farmer_id)')
      .eq('id', id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farms.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
    const extension = path.extname(req.file.originalname || '').toLowerCase();
    const fileName = `${id}-${Date.now()}${extension}`;
    const filePath = `products/${id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    const imageUrl = publicData.publicUrl;

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating product image:', updateError);
      return res.status(500).json({ error: 'Failed to update product image' });
    }

    res.json({
      message: 'Product image updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Upload product image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
