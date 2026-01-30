import React, { useEffect, useMemo, useState } from 'react';
import { productAPI, surplusAPI } from '../services/api';
import './SurplusCenter.css';

const SurplusCenter = () => {
  const [products, setProducts] = useState([]);
  const [optIns, setOptIns] = useState([]);
  const [available, setAvailable] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [claimingId, setClaimingId] = useState(null);

  const optInMap = useMemo(() => {
    const map = new Map();
    optIns.forEach((opt) => {
      map.set(`${opt.farm_id}:${opt.product_id}`, opt.opted_in);
    });
    return map;
  }, [optIns]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, optRes, availableRes, historyRes] = await Promise.all([
        productAPI.getAll({ available: true }),
        surplusAPI.getOptIns(),
        surplusAPI.getAvailable(),
        surplusAPI.getHistory()
      ]);
      setProducts(productsRes.data.products || []);
      setOptIns(optRes.data.opt_ins || []);
      setAvailable(availableRes.data.surplus || []);
      setHistory(historyRes.data.history || []);
    } catch (err) {
      console.error('Load surplus data error:', err);
      setError('Failed to load surplus data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (product, checked) => {
    setError('');
    setMessage('');
    try {
      await surplusAPI.optIn({
        farm_id: product.farm_id,
        product_id: product.id,
        opted_in: checked
      });
      await loadData();
      setMessage(`Surplus alerts ${checked ? 'enabled' : 'disabled'} for ${product.name}.`);
    } catch (err) {
      console.error('Opt-in error:', err);
      setError('Failed to update surplus opt-in.');
    }
  };

  const handleClaim = async (item) => {
    setClaimingId(item.id);
    setError('');
    setMessage('');
    try {
      await surplusAPI.claim({ inventory_id: item.id });
      await loadData();
      setMessage('Surplus item claimed.');
    } catch (err) {
      console.error('Claim surplus error:', err);
      setError(err.response?.data?.error || 'Failed to claim surplus.');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading surplus...</div>;
  }

  return (
    <div className="surplus-center">
      <div className="section-header">
        <div>
          <h2>Surplus Queue</h2>
          <p className="section-subtitle">Opt in to surplus alerts and claim extra inventory.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="surplus-section">
        <h3>Opt-In Preferences</h3>
        {products.length === 0 ? (
          <div className="empty-state">
            <p>No products available for opt-in.</p>
          </div>
        ) : (
          <div className="optin-grid">
            {products.map((product) => {
              const optedIn = optInMap.get(`${product.farm_id}:${product.id}`) || false;
              return (
                <div key={product.id} className="optin-card">
                  <div>
                    <p className="optin-title">{product.name}</p>
                    <p className="optin-meta">{product.farms?.name || 'Farm'}</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={optedIn}
                      onChange={(event) => handleToggle(product, event.target.checked)}
                    />
                    <span>{optedIn ? 'On' : 'Off'}</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="surplus-section">
        <h3>Available Surplus</h3>
        {available.length === 0 ? (
          <div className="empty-state">
            <p>No surplus items available right now.</p>
          </div>
        ) : (
          <div className="available-list">
            {available.map((item) => (
              <div key={item.id} className="available-card">
                <div>
                  <p className="available-title">{item.products?.name || 'Product'}</p>
                  <p className="available-meta">
                    {item.farms?.name || 'Farm'} • {item.date}
                  </p>
                  <p className="available-qty">Quantity: {item.quantity} {item.products?.unit || ''}</p>
                </div>
                <div className="available-actions">
                  {!item.opted_in && (
                    <span className="hint-text">Opt in to claim</span>
                  )}
                  <button
                    className="btn-primary"
                    onClick={() => handleClaim(item)}
                    disabled={!item.opted_in || claimingId === item.id}
                  >
                    {claimingId === item.id ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surplus-section">
        <h3>My Surplus History</h3>
        {history.length === 0 ? (
          <div className="empty-state">
            <p>No surplus history yet.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((row) => (
              <div key={row.id} className="history-row">
                <div>
                  <p className="history-title">{row.products?.name || 'Product'}</p>
                  <p className="history-meta">{row.farms?.name || 'Farm'}</p>
                </div>
                <div className="history-status">
                  <span className={`status-pill ${row.claimed ? 'claimed' : 'pending'}`}>
                    {row.claimed ? 'Claimed' : row.opted_in ? 'Opted In' : 'Opted Out'}
                  </span>
                  <span className="history-date">{row.claimed_at ? new Date(row.claimed_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurplusCenter;
