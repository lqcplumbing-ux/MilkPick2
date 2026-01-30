import React, { useState } from 'react';
import { orderAPI } from '../services/api';
import './OrderEditForm.css';

const OrderEditForm = ({ order, onSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    quantity: order.quantity,
    scheduled_date: order.scheduled_date,
    notes: order.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await orderAPI.update(order.id, {
        quantity: Number(formData.quantity),
        scheduled_date: formData.scheduled_date,
        notes: formData.notes
      });
      onSaved(response.data.order);
    } catch (submitError) {
      setError(submitError.response?.data?.error || 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-edit-form">
      <div className="form-header">
        <div>
          <h3>Edit Order</h3>
          <p>{order.products?.name || 'Order'} · {order.scheduled_date}</p>
        </div>
        <button type="button" className="btn-link" onClick={onCancel}>Close</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Pickup Date</label>
          <input
            type="date"
            name="scheduled_date"
            value={formData.scheduled_date}
            onChange={handleChange}
          />
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
        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderEditForm;
