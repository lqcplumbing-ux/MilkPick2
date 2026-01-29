import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import './ProductForm.css';

const ProductForm = ({ product, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    type: product?.type || 'milk',
    unit: product?.unit || 'gallon',
    available: product?.available !== undefined ? product.available : true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || '');
  const [previewObjectUrl, setPreviewObjectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller');
      return;
    }

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewObjectUrl(objectUrl);
    setImagePreview(objectUrl);
    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
      };

      let response;
      if (product) {
        response = await productAPI.update(product.id, data);
      } else {
        response = await productAPI.create(data);
      }

      let savedProduct = response.data.product;

      if (imageFile) {
        try {
          const uploadResponse = await productAPI.uploadImage(savedProduct.id, imageFile);
          savedProduct = uploadResponse.data.product;
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          alert('Product saved, but image upload failed.');
        }
      }

      onSubmit(savedProduct);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <h3>{product ? 'Edit Product' : 'Add New Product'}</h3>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Fresh Whole Milk"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="milk">Milk</option>
              <option value="beef">Beef</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your product..."
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
            >
              <option value="gallon">Gallon</option>
              <option value="half-gallon">Half Gallon</option>
              <option value="quart">Quart</option>
              <option value="pint">Pint</option>
              <option value="lb">Pound (lb)</option>
              <option value="each">Each</option>
              <option value="dozen">Dozen</option>
            </select>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="available"
              checked={formData.available}
              onChange={handleChange}
            />
            Available for sale
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="image">Product Image</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
          />
          <p className="input-hint">JPG, PNG, WEBP, or GIF up to 5MB.</p>
        </div>

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt={`${formData.name || 'Product'} preview`} />
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
