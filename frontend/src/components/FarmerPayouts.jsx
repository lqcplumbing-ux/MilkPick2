import React, { useEffect, useState } from 'react';
import { paymentAPI } from '../services/api';
import './FarmerPayouts.css';

const FarmerPayouts = () => {
  const [status, setStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusResponse, transactionResponse] = await Promise.all([
        paymentAPI.connectStatus(),
        paymentAPI.getFarmTransactions()
      ]);
      setStatus(statusResponse.data);
      setTransactions(transactionResponse.data.transactions || []);
    } catch (err) {
      console.error('Load payout data error:', err);
      setError('Failed to load payout data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOnboard = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await paymentAPI.connectOnboard();
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Stripe onboarding error:', err);
      setError('Failed to start Stripe onboarding.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading payouts...</div>;
  }

  const connected = status?.connected;
  const chargesEnabled = status?.charges_enabled;
  const payoutsEnabled = status?.payouts_enabled;

  return (
    <div className="farmer-payouts">
      <div className="section-header">
        <div>
          <h2>Payouts</h2>
          <p className="section-subtitle">Connect Stripe to receive payouts and track earnings.</p>
        </div>
        <button className="btn-primary" onClick={handleOnboard} disabled={actionLoading}>
          {connected ? 'Manage Stripe' : 'Set Up Stripe'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="connect-status">
        <div className="status-card">
          <h4>Stripe Connection</h4>
          <p className={`status-pill ${connected ? 'active' : 'pending'}`}>
            {connected ? 'Connected' : 'Not Connected'}
          </p>
        </div>
        <div className="status-card">
          <h4>Charges</h4>
          <p className={`status-pill ${chargesEnabled ? 'active' : 'pending'}`}>
            {chargesEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="status-card">
          <h4>Payouts</h4>
          <p className={`status-pill ${payoutsEnabled ? 'active' : 'pending'}`}>
            {payoutsEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>

      <div className="payout-history">
        <h3>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="history-list">
            {transactions.map((txn) => (
              <div key={txn.id} className="history-row">
                <div>
                  <p className="history-title">{txn.orders?.products?.name || 'Order payment'}</p>
                  <p className="history-meta">
                    {txn.orders?.scheduled_date ? `Pickup ${txn.orders.scheduled_date}` : 'Order'}
                  </p>
                </div>
                <div className="history-amount">
                  <span>${Number(txn.amount).toFixed(2)}</span>
                  <span className={`status-pill ${txn.status}`}>{txn.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerPayouts;
