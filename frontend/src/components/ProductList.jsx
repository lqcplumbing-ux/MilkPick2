import React, { useState } from 'react';
import { productAPI } from '../services/api';
import './ProductList.css';

const ProductList = ({ products, onEdit, onDelete, onToggleAvailability }) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      await productAPI.delete(product.id);
      onDelete(product.id);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'milk': return '\uD83E\uDD5B';
      case 'beef': return '\uD83E\uDD69';
      default: return '\uD83C\uDF3E';
    }
  };

  if (products.length === 0) {
    return (
      <div className="no-products">
        <p>No products yet. Add your first product to get started!</p>
      </div>
    );
  }

  return (
    <div className="product-list">
      {products.map(product => (
        <div key={product.id} className={`product-card ${!product.available ? 'unavailable' : ''}`}>
          <div className="product-media">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={`${product.name} image`}
                className="product-image"
              />
            ) : (
              <div className="product-icon">{getTypeIcon(product.type)}</div>
            )}
          </div>
          <div className="product-info">
            <h4>{product.name}</h4>
            <p className="product-type">{product.type}</p>
            {product.description && (
              <p className="product-description">{product.description}</p>
            )}
          </div>
          <div className="product-price">
            <span className="price">${parseFloat(product.price).toFixed(2)}</span>
            <span className="unit">/{product.unit}</span>
          </div>
          <div className="product-status">
            <span className={`status-badge ${product.available ? 'available' : 'out-of-stock'}`}>
              {product.available ? 'Available' : 'Out of Stock'}
            </span>
          </div>
          <div className="product-actions">
            <button
              className="btn-icon"
              onClick={() => onToggleAvailability(product.id)}
              title={product.available ? 'Mark as unavailable' : 'Mark as available'}
            >
              {product.available ? '\u23F8' : '\u25B6'}
            </button>
            <button
              className="btn-icon edit"
              onClick={() => onEdit(product)}
              title="Edit product"
            >
              \u270E
            </button>
            <button
              className="btn-icon delete"
              onClick={() => handleDelete(product)}
              disabled={deletingId === product.id}
              title="Delete product"
            >
              \uD83D\uDDD1
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
