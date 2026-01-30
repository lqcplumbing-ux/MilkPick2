import React, { useEffect, useState } from 'react';
import { surplusAPI } from '../services/api';
import './SurplusFarmPanel.css';

const SurplusFarmPanel = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await surplusAPI.getFarmHistory();
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Load surplus history error:', err);
      setError('Failed to load surplus history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return <div className="loading">Loading surplus history...</div>;
  }

  return (
    <div className="surplus-farm-panel">
      <div className="section-header">
        <div>
          <h2>Surplus Claims</h2>
          <p className="section-subtitle">Track customer opt-ins and claimed surplus.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {history.length === 0 ? (
        <div className="empty-state">
          <p>No surplus history yet.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((row) => {
            const customer = row.customers || {};
            const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer';
            return (
              <div key={row.id} className="history-row">
                <div>
                  <p className="history-title">{row.products?.name || 'Product'}</p>
                  <p className="history-meta">{customerName}</p>
                </div>
                <div className="history-status">
                  <span className={`status-pill ${row.claimed ? 'claimed' : row.opted_in ? 'pending' : 'off'}`}>
                    {row.claimed ? 'Claimed' : row.opted_in ? 'Opted In' : 'Opted Out'}
                  </span>
                  <span className="history-date">
                    {row.claimed_at ? new Date(row.claimed_at).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SurplusFarmPanel;
