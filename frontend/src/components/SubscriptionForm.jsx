import React, { useMemo, useState } from 'react';
import { addDays, addMonths, format, parseISO } from 'date-fns';
import { subscriptionAPI } from '../services/api';
import './SubscriptionForm.css';

const getNextDate = (date, frequency) => {
  switch (frequency) {
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'monthly':
      return addMonths(date, 1);
    default:
      return date;
  }
};

const buildPreviewDates = (startDate, frequency, count = 4) => {
  if (!startDate) return [];
  let nextDate = parseISO(startDate);
  if (Number.isNaN(nextDate.getTime())) {
    return [];
  }
  const today = new Date();
  let guard = 0;
  while (nextDate < today && guard < 400) {
    nextDate = getNextDate(nextDate, frequency);
    guard += 1;
  }

  const dates = [];
  for (let i = 0; i < count; i += 1) {
    dates.push(format(nextDate, 'MMM d, yyyy'));
    nextDate = getNextDate(nextDate, frequency);
  }
  return dates;
};

const SubscriptionForm = ({
  product,
  products = [],
  subscription,
  onSaved,
  onCancel
}) => {
  const isEditing = Boolean(subscription);
  const [formData, setFormData] = useState({
    product_id: product?.id || subscription?.products?.id || '',
    frequency: subscription?.frequency || 'weekly',
    quantity: subscription?.quantity || 1,
    start_date: subscription?.start_date || new Date().toISOString().slice(0, 10)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const previewDates = useMemo(
    () => buildPreviewDates(formData.start_date, formData.frequency, 5),
    [formData.start_date, formData.frequency]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isEditing) {
        response = await subscriptionAPI.update(subscription.id, {
          frequency: formData.frequency,
          quantity: Number(formData.quantity),
          start_date: formData.start_date
        });
      } else {
        response = await subscriptionAPI.create({
          product_id: formData.product_id,
          frequency: formData.frequency,
          quantity: Number(formData.quantity),
          start_date: formData.start_date
        });
      }

      onSaved(response.data.subscription);
    } catch (submitError) {
      setError(submitError.response?.data?.error || 'Failed to save subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-form-container">
      <div className="form-header">
        <div>
          <h3>{isEditing ? 'Edit Subscription' : 'Create Subscription'}</h3>
          {product && <p className="form-subtitle">Subscribe to {product.name}</p>}
        </div>
        <button type="button" className="btn-link" onClick={onCancel}>Close</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="subscription-form">
        {!product && (
          <div className="form-group">
            <label>Product</label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.farms?.name || 'Local Farm'})
                </option>
              ))}
            </select>
          </div>
        )}

        {product && (
          <div className="product-summary">
            <span>{product.name}</span>
            <span className="product-price">
              ${parseFloat(product.price).toFixed(2)}/{product.unit}
            </span>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Frequency</label>
            <select name="frequency" value={formData.frequency} onChange={handleChange}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
          />
        </div>

        <div className="preview-panel">
          <h4>Upcoming Pickups</h4>
          {previewDates.length === 0 ? (
            <p>Select a date to preview upcoming orders.</p>
          ) : (
            <ul>
              {previewDates.map((date) => (
                <li key={date}>{date}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Update Subscription' : 'Start Subscription'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubscriptionForm;
