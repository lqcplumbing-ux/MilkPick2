import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { farmAPI, productAPI, subscriptionAPI, orderAPI } from '../services/api';
import SubscriptionForm from '../components/SubscriptionForm';
import SubscriptionList from '../components/SubscriptionList';
import ScheduleCalendar from '../components/ScheduleCalendar';
import OrderEditForm from '../components/OrderEditForm';
import PaymentCenter from '../components/PaymentCenter';
import NotificationCenter from '../components/NotificationCenter';
import SurplusCenter from '../components/SurplusCenter';
import './CustomerDashboard.css';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  const [showOrderEdit, setShowOrderEdit] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderView, setOrderView] = useState('upcoming');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [qrModalOrder, setQrModalOrder] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

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
        orderAPI.getMyOrders()
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
      const response = await orderAPI.getMyOrders();
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderInState = (updatedOrder) => {
    setOrders((prev) => prev.map((order) => (
      order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
    )));
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

  const handleOrderEdit = (order) => {
    setEditingOrder(order);
    setShowOrderEdit(true);
  };

  const handleOrderCancel = async (order) => {
    if (!window.confirm('Cancel this order?')) {
      return;
    }
    try {
      await orderAPI.cancel(order.id);
      await loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      setErrorMessage('Failed to cancel order');
    }
  };

  const handleShowQr = async (order) => {
    setQrModalOrder(order);
    setQrDataUrl('');
    setQrCode('');
    setQrError('');
    setQrLoading(true);
    try {
      const response = await orderAPI.getQr(order.id);
      setQrDataUrl(response.data.qr_image);
      setQrCode(response.data.qr_code);
    } catch (error) {
      console.error('Error loading QR code:', error);
      setQrError('Failed to load QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSelfConfirm = async (order) => {
    if (!window.confirm('Confirm pickup for this order?')) {
      return;
    }
    setConfirmingOrderId(order.id);
    try {
      const response = await orderAPI.selfConfirm(order.id);
      updateOrderInState(response.data.order);
    } catch (error) {
      console.error('Error confirming pickup:', error);
      setErrorMessage('Failed to confirm pickup');
    } finally {
      setConfirmingOrderId(null);
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

  const formatConfirmationMethod = (method) => {
    switch (method) {
      case 'qr_code':
        return 'QR Scan';
      case 'farmer_manual':
        return 'Farmer Manual';
      case 'customer_self':
        return 'Self Confirm';
      default:
        return 'Confirmed';
    }
  };

  const canShowQr = (order) => !['cancelled', 'no_show', 'picked_up'].includes(order.status);

  const canSelfConfirm = (order) => {
    if (['cancelled', 'no_show', 'picked_up'].includes(order.status)) {
      return false;
    }
    const today = new Date().toISOString().slice(0, 10);
    return order.scheduled_date <= today;
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    const today = new Date().toISOString().slice(0, 10);

    if (orderView === 'upcoming') {
      list = list.filter((order) => (
        order.scheduled_date >= today && !['cancelled', 'picked_up', 'no_show'].includes(order.status)
      ));
    }
    if (orderView === 'history') {
      list = list.filter((order) => (
        order.scheduled_date < today || ['cancelled', 'picked_up', 'no_show'].includes(order.status)
      ));
    }

    if (orderStatusFilter !== 'all') {
      list = list.filter((order) => order.status === orderStatusFilter);
    }

    if (orderSearch.trim()) {
      const term = orderSearch.toLowerCase();
      list = list.filter((order) => {
        const productName = order.products?.name?.toLowerCase() || '';
        const farmName = order.farms?.name?.toLowerCase() || '';
        return productName.includes(term) || farmName.includes(term);
      });
    }

    return list;
  }, [orders, orderView, orderStatusFilter, orderSearch]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    filteredOrders.forEach((order) => {
      if (!groups[order.scheduled_date]) {
        groups[order.scheduled_date] = [];
      }
      groups[order.scheduled_date].push(order);
    });
    return groups;
  }, [filteredOrders]);

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
        <button
          className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payments
        </button>
        <button
          className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`nav-btn ${activeTab === 'surplus' ? 'active' : ''}`}
          onClick={() => setActiveTab('surplus')}
        >
          Surplus
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
                        <div className="product-actions">
                          <button
                            className="btn-secondary"
                            onClick={() => navigate(`/products/${product.id}`)}
                          >
                            Details
                          </button>
                          <button className="btn-order" onClick={() => handleSubscribeClick(product)}>
                            Subscribe
                          </button>
                        </div>
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
                <p className="section-subtitle">Track and manage your upcoming orders.</p>
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
                <div className="policy-card">
                  <strong>Cancellation policy:</strong> Cancel at least 24 hours before pickup to avoid penalties.
                </div>

                <div className="order-filters">
                  <div className="toggle-group">
                    <button
                      className={orderView === 'upcoming' ? 'active' : ''}
                      onClick={() => setOrderView('upcoming')}
                    >
                      Upcoming
                    </button>
                    <button
                      className={orderView === 'history' ? 'active' : ''}
                      onClick={() => setOrderView('history')}
                    >
                      History
                    </button>
                  </div>
                  <div className="filter-group">
                    <label>Status</label>
                    <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="picked_up">Picked Up</option>
                      <option value="late">Late</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Search</label>
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Farm or product"
                    />
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="empty-state">
                    <p>No orders match the current filters.</p>
                  </div>
                ) : (
                  <>
                    <ScheduleCalendar orders={filteredOrders} />
                    <div className="orders-list">
                    {Object.keys(groupedOrders).sort().map((date) => (
                        <div key={date} className="order-day-card">
                          <h4>{date}</h4>
                          {groupedOrders[date].map((order) => (
                            <div key={order.id} className="order-item">
                              <div>
                                <span className="order-product">{order.products?.name || 'Product'}</span>
                                <span className="order-farm">{order.farms?.name || 'Farm'}</span>
                                <span className={`order-status ${order.status}`}>{order.status}</span>
                                {order.status === 'picked_up' && (
                                  <span className="order-confirmation">
                                    {formatConfirmationMethod(order.confirmation_method)}
                                    {order.pickup_confirmed_at && (
                                      <span className="order-confirmation-time">
                                        {' '} - {new Date(order.pickup_confirmed_at).toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="order-actions">
                                <span className="order-quantity">{order.quantity} {order.products?.unit || ''}</span>
                                {canShowQr(order) && (
                                  <button
                                    className="btn-secondary"
                                    onClick={() => handleShowQr(order)}
                                  >
                                    Show QR
                                  </button>
                                )}
                                {canSelfConfirm(order) && (
                                  <button
                                    className="btn-primary"
                                    onClick={() => handleSelfConfirm(order)}
                                    disabled={confirmingOrderId === order.id}
                                  >
                                    {confirmingOrderId === order.id ? 'Confirming...' : 'Confirm Pickup'}
                                  </button>
                                )}
                                {order.status === 'pending' && orderView === 'upcoming' && (
                                  <>
                                    <button
                                      className="btn-secondary"
                                      onClick={() => handleOrderEdit(order)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn-danger"
                                      onClick={() => handleOrderCancel(order)}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <PaymentCenter />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenter />
        )}

        {activeTab === 'surplus' && (
          <SurplusCenter />
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

      {showOrderEdit && editingOrder && (
        <div className="modal-backdrop">
          <OrderEditForm
            order={editingOrder}
            onSaved={async () => {
              setShowOrderEdit(false);
              setEditingOrder(null);
              await loadOrders();
            }}
            onCancel={() => {
              setShowOrderEdit(false);
              setEditingOrder(null);
            }}
          />
        </div>
      )}

      {qrModalOrder && (
        <div className="modal-backdrop">
          <div className="qr-modal">
            <div className="modal-header">
              <div>
                <h3>Pickup QR Code</h3>
                <p>{qrModalOrder.scheduled_date}</p>
              </div>
              <button
                className="link-btn"
                onClick={() => {
                  setQrModalOrder(null);
                  setQrDataUrl('');
                  setQrCode('');
                  setQrError('');
                }}
              >
                Close
              </button>
            </div>
            <div className="qr-modal-body">
              {qrLoading ? (
                <div className="loading-inline">Loading QR code...</div>
              ) : qrError ? (
                <div className="error-message">{qrError}</div>
              ) : (
                <>
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="Pickup QR code" className="qr-image" />
                  )}
                  {qrCode && <p className="qr-code-text">Code: {qrCode}</p>}
                  <p className="qr-help">Show this QR code to the farmer at pickup.</p>
                </>
              )}
            </div>
          </div>
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
