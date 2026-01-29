import React from 'react';
import './SubscriptionList.css';

const SubscriptionList = ({ subscriptions, onEdit, onCancel }) => {
  if (!subscriptions.length) {
    return (
      <div className="empty-state">
        <p>No subscriptions yet. Choose a product to get started.</p>
      </div>
    );
  }

  return (
    <div className="subscription-list">
      {subscriptions.map((subscription) => (
        <div key={subscription.id} className="subscription-card">
          <div className="subscription-info">
            <h4>{subscription.products?.name || 'Subscription'}</h4>
            <p className="subscription-farm">{subscription.farms?.name || 'Local Farm'}</p>
            <div className="subscription-meta">
              <span>{subscription.quantity} {subscription.products?.unit || 'unit'} · {subscription.frequency}</span>
              <span>Next: {subscription.next_order_date || 'TBD'}</span>
            </div>
            <span className={`status-badge ${subscription.active ? 'active' : 'inactive'}`}>
              {subscription.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="subscription-actions">
            <button className="btn-secondary" onClick={() => onEdit(subscription)}>
              Edit
            </button>
            <button className="btn-danger" onClick={() => onCancel(subscription)}>
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SubscriptionList;
