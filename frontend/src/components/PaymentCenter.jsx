import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { paymentAPI } from '../services/api';
import './PaymentCenter.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CardSetupForm = ({ clientSecret, onSaved, onCancel, defaultChecked }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [makeDefault, setMakeDefault] = useState(defaultChecked);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement }
      });

      if (result.error) {
        setError(result.error.message || 'Failed to save card');
        return;
      }

      await paymentAPI.storePaymentMethod({
        payment_method_id: result.setupIntent.payment_method,
        make_default: makeDefault
      });

      onSaved();
    } catch (err) {
      console.error('Card setup error:', err);
      setError('Failed to save card.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <label>Card details</label>
      <div className="card-element">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(event) => setMakeDefault(event.target.checked)}
        />
        Set as default payment method
      </label>
      {error && <div className="inline-error">{error}</div>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={processing}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={processing || !stripe}>
          {processing ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </form>
  );
};

const PaymentCenter = () => {
  const [methods, setMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const defaultMethodId = useMemo(() => (
    methods.find((method) => method.is_default)?.id || null
  ), [methods]);

  const loadMethods = async () => {
    try {
      const response = await paymentAPI.getMethods();
      setMethods(response.data.methods || []);
    } catch (err) {
      console.error('Load payment methods error:', err);
      setError('Failed to load payment methods.');
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await paymentAPI.getHistory();
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Load payment history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    await Promise.all([loadMethods(), loadHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCard = async () => {
    if (!publishableKey) {
      setActionError('Stripe publishable key is missing. Check your .env file.');
      return;
    }
    setActionMessage('');
    setActionError('');
    try {
      const response = await paymentAPI.createSetupIntent();
      setClientSecret(response.data.client_secret);
      setShowAddForm(true);
    } catch (err) {
      console.error('Create setup intent error:', err);
      setActionError('Unable to start card setup.');
    }
  };

  const handleSetDefault = async (methodId) => {
    setActionError('');
    setActionMessage('');
    try {
      await paymentAPI.setDefaultMethod(methodId);
      await loadMethods();
      setActionMessage('Default payment method updated.');
    } catch (err) {
      console.error('Set default error:', err);
      setActionError('Failed to update default method.');
    }
  };

  const handleRemove = async (methodId) => {
    if (!window.confirm('Remove this payment method?')) {
      return;
    }
    setActionError('');
    setActionMessage('');
    try {
      await paymentAPI.removeMethod(methodId);
      await loadMethods();
      setActionMessage('Payment method removed.');
    } catch (err) {
      console.error('Remove payment method error:', err);
      setActionError('Failed to remove payment method.');
    }
  };

  const handleSaved = async () => {
    setShowAddForm(false);
    setClientSecret('');
    setActionMessage('Payment method saved.');
    await loadMethods();
  };

  if (loading) {
    return <div className="loading">Loading payments...</div>;
  }

  return (
    <div className="payment-center">
      <div className="section-header">
        <div>
          <h2>Payments</h2>
          <p className="section-subtitle">Manage cards and review your payment history.</p>
        </div>
        <button className="btn-primary" onClick={handleAddCard}>
          Add Card
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {actionError && <div className="error-message">{actionError}</div>}
      {actionMessage && <div className="success-message">{actionMessage}</div>}

      {showAddForm && (
        <div className="card-form-wrapper">
          <Elements stripe={stripePromise}>
            <CardSetupForm
              clientSecret={clientSecret}
              defaultChecked={!defaultMethodId}
              onSaved={handleSaved}
              onCancel={() => {
                setShowAddForm(false);
                setClientSecret('');
              }}
            />
          </Elements>
        </div>
      )}

      <div className="payment-methods">
        <h3>Saved Cards</h3>
        {methods.length === 0 ? (
          <div className="empty-state">
            <p>No cards saved yet.</p>
          </div>
        ) : (
          <div className="method-list">
            {methods.map((method) => (
              <div key={method.id} className="method-card">
                <div>
                  <p className="method-brand">{method.brand || 'Card'} **** {method.last_four}</p>
                  <p className="method-exp">Expires {method.exp_month}/{method.exp_year}</p>
                </div>
                <div className="method-actions">
                  {method.is_default ? (
                    <span className="default-pill">Default</span>
                  ) : (
                    <button className="btn-secondary" onClick={() => handleSetDefault(method.id)}>
                      Make Default
                    </button>
                  )}
                  <button className="link-btn" onClick={() => handleRemove(method.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="payment-history">
        <h3>Payment History</h3>
        {historyLoading ? (
          <div className="loading-inline">Loading history...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <p>No payments recorded yet.</p>
          </div>
        ) : (
          <div className="history-list">
            {transactions.map((txn) => (
              <div key={txn.id} className="history-row">
                <div>
                  <p className="history-title">{txn.orders?.products?.name || 'Order payment'}</p>
                  <p className="history-meta">
                    {txn.orders?.scheduled_date ? `Pickup ${txn.orders.scheduled_date}` : 'Subscription charge'}
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

export default PaymentCenter;
