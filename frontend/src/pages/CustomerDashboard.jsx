import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { farmAPI, productAPI, subscriptionAPI, orderAPI } from '../services/api';
import SubscriptionForm from '../components/SubscriptionForm';
import SubscriptionList from '../components/SubscriptionList';
import ScheduleCalendar from '../components/ScheduleCalendar';
import './CustomerDashboard.css';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [farms, setFarms] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('farms');
  const [productFilter, setProductFilter] = useState('all');
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [farmsResponse, productsResponse, subscriptionsResponse, ordersResponse] = await Promise.all([
        farmAPI.getAll(),
        productAPI.getAll({ available: true }),
        subscriptionAPI.getMySubscriptions(),
        orderAPI.getUpcoming()
      ]);
      setFarms(farmsResponse.data.farms);
      setProducts(productsResponse.data.products);
      setSubscriptions(subscriptionsResponse.data.subscriptions || []);
      setOrders(ordersResponse.data.orders || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    setSubscriptionsLoading(true);
    try {
      const response = await subscriptionAPI.getMySubscriptions();
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await orderAPI.getUpcoming();
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleFarmSelect = async (farm) => {
    setSelectedFarm(farm);
    setActiveTab('products');
    setProductFilter('all');
  };

  const handleSubscribeClick = (product) => {
    setSelectedProduct(product);
    setEditingSubscription(null);
    setShowSubscriptionForm(true);
  };

  const handleSubscriptionSaved = async () => {
    setShowSubscriptionForm(false);
    setSelectedProduct(null);
    setEditingSubscription(null);
    await loadSubscriptions();
    await loadOrders();
  };

  const handleSubscriptionEdit = (subscription) => {
    setEditingSubscription(subscription);
    setSelectedProduct(subscription.products || null);
    setShowSubscriptionForm(true);
  };

  const handleSubscriptionCancel = async (subscription) => {
    if (!window.confirm('Cancel this subscription? Upcoming orders will be cancelled.')) {
      return;
    }
    try {
      await subscriptionAPI.cancel(subscription.id);
      await loadSubscriptions();
      await loadOrders();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setErrorMessage('Failed to cancel subscription');
    }
  };

  const filteredProducts = products.filter(product => {
    if (selectedFarm && product.farm_id !== selectedFarm.id) return false;
    if (productFilter !== 'all' && product.type !== productFilter) return false;
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'milk': return '\uD83E\uDD5B';
      case 'beef': return '\uD83E\uDD69';
      default: return '\uD83C\uDF3E';
    }
  };

  const groupedOrders = useMemo(() => {
    const groups = {};
    orders.forEach((order) => {
      if (!groups[order.scheduled_date]) {
        groups[order.scheduled_date] = [];
      }
      groups[order.scheduled_date].push(order);
    });
    return groups;
  }, [orders]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="customer-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>MilkPick</h1>
          <div className="header-actions">
            <span className="user-name">Hi, {user?.first_name || user?.email}</span>
            <button onClick={logout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-nav">
        <button
          className={`nav-btn ${activeTab === 'farms' ? 'active' : ''}`}
          onClick={() => { setActiveTab('farms'); setSelectedFarm(null); }}
        >
          Browse Farms
        </button>
        <button
          className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          All Products
        </button>
        <button
          className={`nav-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          Subscriptions
        </button>
        <button
          className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            loadOrders();
          }}
        >
          My Orders
        </button>
      </div>

      <main className="dashboard-main">
        {activeTab === 'farms' && (
          <div className="farms-section">
            <h2>Local Farms</h2>
            <p className="section-subtitle">Choose a farm to view their products</p>

            {farms.length === 0 ? (
              <div className="empty-state">
                <p>No farms available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="farms-grid">
                {farms.map(farm => (
                  <div key={farm.id} className="farm-card" onClick={() => handleFarmSelect(farm)}>
                    <div className="farm-icon">\uD83C\uDFE1</div>
                    <h3>{farm.name}</h3>
                    <p className="farm-location">{farm.city}, {farm.state}</p>
                    {farm.description && (
                      <p className="farm-description">{farm.description.substring(0, 100)}...</p>
                    )}
                    <button className="btn-view">View Products</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-section">
            <div className="section-header">
              <div>
                <h2>
                  {selectedFarm ? `Products from ${selectedFarm.name}` : 'All Products'}
                </h2>
                {selectedFarm && (
                  <button className="link-btn" onClick={() => setSelectedFarm(null)}>
                    View all farms
                  </button>
                )}
              </div>
              <div className="filter-group">
                <label>Filter:</label>
                <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                  <option value="all">All Products</option>
                  <option value="milk">Milk</option>
                  <option value="beef">Beef</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                <p>No products available with the current filter.</p>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <div key={product.id} className="product-card">
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
                    <div className="product-details">
                      <h4>{product.name}</h4>
                      <p className="product-farm">{product.farms?.name || 'Local Farm'}</p>
                      {product.description && (
                        <p className="product-description">{product.description}</p>
                      )}
                      <div className="product-footer">
                        <span className="product-price">
                          ${parseFloat(product.price).toFixed(2)}/{product.unit}
                        </span>
                        <button className="btn-order" onClick={() => handleSubscribeClick(product)}>
                          Subscribe
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="subscriptions-section">
            <div className="section-header">
              <div>
                <h2>Your Subscriptions</h2>
                <p className="section-subtitle">Manage pickup frequency and quantities.</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  setSelectedProduct(null);
                  setEditingSubscription(null);
                  setShowSubscriptionForm(true);
                }}
              >
                New Subscription
              </button>
            </div>

            {subscriptionsLoading ? (
              <div className="loading">Loading subscriptions...</div>
            ) : (
              <SubscriptionList
                subscriptions={subscriptions}
                onEdit={handleSubscriptionEdit}
                onCancel={handleSubscriptionCancel}
              />
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header">
              <div>
                <h2>Pickup Schedule</h2>
                <p className="section-subtitle">Track your upcoming orders and pickup dates.</p>
              </div>
            </div>

            {ordersLoading ? (
              <div className="loading">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming orders yet. Create a subscription to get started.</p>
              </div>
            ) : (
              <>
                <ScheduleCalendar orders={orders} />
                <div className="orders-list">
                  {Object.keys(groupedOrders).map((date) => (
                    <div key={date} className="order-day-card">
                      <h4>{date}</h4>
                      {groupedOrders[date].map((order) => (
                        <div key={order.id} className="order-item">
                          <div>
                            <span className="order-product">{order.products?.name || 'Product'}</span>
                            <span className="order-farm">{order.farms?.name || 'Farm'}</span>
                          </div>
                          <span className="order-quantity">{order.quantity} {order.products?.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showSubscriptionForm && (
        <div className="modal-backdrop">
          <SubscriptionForm
            product={selectedProduct}
            products={products}
            subscription={editingSubscription}
            onSaved={handleSubscriptionSaved}
            onCancel={() => {
              setShowSubscriptionForm(false);
              setSelectedProduct(null);
              setEditingSubscription(null);
              setErrorMessage('');
            }}
          />
        </div>
      )}

      {errorMessage && (
        <div className="toast-error">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
