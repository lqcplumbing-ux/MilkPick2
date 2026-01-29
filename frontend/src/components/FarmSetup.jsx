import React, { useState } from 'react';
import { farmAPI } from '../services/api';
import './FarmSetup.css';

const FarmSetup = ({ farm, onFarmCreated, onFarmUpdated }) => {
  const [formData, setFormData] = useState({
    name: farm?.name || '',
    description: farm?.description || '',
    address: farm?.address || '',
    city: farm?.city || '',
    state: farm?.state || '',
    zip_code: farm?.zip_code || '',
    phone: farm?.phone || '',
    email: farm?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (farm) {
        const response = await farmAPI.update(farm.id, formData);
        onFarmUpdated(response.data.farm);
        setSuccess('Farm updated successfully!');
      } else {
        const response = await farmAPI.create(formData);
        onFarmCreated(response.data.farm);
        setSuccess('Farm created successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save farm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farm-setup">
      <h2>{farm ? 'Edit Farm Profile' : 'Create Your Farm'}</h2>
      <p className="form-subtitle">
        {farm
          ? 'Update your farm information below.'
          : 'Fill in your farm details to get started.'}
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Farm Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your farm name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell customers about your farm..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
            />
          </div>

          <div className="form-group">
            <label htmlFor="state">State</label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
            />
          </div>

          <div className="form-group">
            <label htmlFor="zip_code">ZIP Code</label>
            <input
              type="text"
              id="zip_code"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              placeholder="ZIP"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Farm Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Contact email"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : farm ? 'Update Farm' : 'Create Farm'}
        </button>
      </form>
    </div>
  );
};

export default FarmSetup;
