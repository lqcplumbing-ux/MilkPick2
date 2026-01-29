import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { farmAPI, productAPI } from '../services/api';
import './CustomerDashboard.css';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [farms, setFarms] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('farms');
  const [productFilter, setProductFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [farmsResponse, productsResponse] = await Promise.all([
        farmAPI.getAll(),
        productAPI.getAll({ available: true })
      ]);
      setFarms(farmsResponse.data.farms);
      setProducts(productsResponse.data.products);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFarmSelect = async (farm) => {
    setSelectedFarm(farm);
    setActiveTab('products');
    setProductFilter('all');
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
          className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
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
                        <button className="btn-order">Order</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <h2>My Orders</h2>
            <div className="coming-soon">
              <p>Order management will be available in Phase 5.</p>
              <p>Features coming soon:</p>
              <ul>
                <li>Set up recurring milk subscriptions</li>
                <li>View order history</li>
                <li>Modify or cancel orders</li>
                <li>QR code pickup confirmation</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
