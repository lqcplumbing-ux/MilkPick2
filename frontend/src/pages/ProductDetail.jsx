import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productAPI } from '../services/api';
import SubscriptionForm from '../components/SubscriptionForm';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await productAPI.getById(id);
        setProduct(response.data.product);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="product-detail">
        <p>{error || 'Product not found.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail">
      <button className="btn-link" onClick={() => navigate('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="detail-card">
        <div className="detail-media">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="placeholder-media">No image available</div>
          )}
        </div>

        <div className="detail-content">
          <h1>{product.name}</h1>
          <p className="detail-farm">{product.farms?.name || 'Local Farm'}</p>
          <p className="detail-location">
            {product.farms?.city || 'City'}, {product.farms?.state || 'State'}
          </p>
          <div className="detail-price">
            ${parseFloat(product.price).toFixed(2)} / {product.unit}
          </div>
          {product.description && <p className="detail-description">{product.description}</p>}

          <div className="detail-actions">
            <button className="btn-primary" onClick={() => setShowSubscriptionForm(true)}>
              Subscribe
            </button>
            <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
              Browse More Products
            </button>
          </div>

          {success && <div className="success-message">{success}</div>}
        </div>
      </div>

      <div className="detail-info-grid">
        <div className="info-card">
          <h3>Farm Contact</h3>
          <p>{product.farms?.phone || 'Phone not provided'}</p>
          <p>{product.farms?.email || 'Email not provided'}</p>
        </div>
        <div className="info-card">
          <h3>Product Details</h3>
          <p>Type: {product.type}</p>
          <p>Availability: {product.available ? 'Available' : 'Unavailable'}</p>
        </div>
      </div>

      {showSubscriptionForm && (
        <div className="modal-backdrop">
          <SubscriptionForm
            product={product}
            onSaved={() => {
              setShowSubscriptionForm(false);
              setSuccess('Subscription created! Check your dashboard for upcoming pickups.');
            }}
            onCancel={() => setShowSubscriptionForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
