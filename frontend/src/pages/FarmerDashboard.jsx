import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { farmAPI, productAPI } from '../services/api';
import FarmSetup from '../components/FarmSetup';
import ProductList from '../components/ProductList';
import ProductForm from '../components/ProductForm';
import InventoryManager from '../components/InventoryManager';
import FarmerOrders from '../components/FarmerOrders';
import FarmerPayouts from '../components/FarmerPayouts';
import NotificationCenter from '../components/NotificationCenter';
import './FarmerDashboard.css';

const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const [farm, setFarm] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadFarmData();
  }, []);

  const loadFarmData = async () => {
    setLoading(true);
    try {
      const farmResponse = await farmAPI.getMyFarm();
      setFarm(farmResponse.data.farm);
      setProducts(farmResponse.data.farm.products || []);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading farm:', error);
      }
      setFarm(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFarmCreated = (newFarm) => {
    setFarm(newFarm);
  };

  const handleFarmUpdated = (updatedFarm) => {
    setFarm(updatedFarm);
  };

  const handleProductCreated = (product) => {
    setProducts([...products, product]);
    setShowProductForm(false);
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const handleProductDeleted = (productId) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const handleToggleAvailability = async (productId) => {
    try {
      const response = await productAPI.toggleAvailability(productId);
      setProducts(products.map(p =>
        p.id === productId ? response.data.product : p
      ));
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="farmer-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Farmer Dashboard</h1>
          <div className="header-actions">
            <span className="user-name">{user?.first_name || user?.email}</span>
            <button onClick={logout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-nav">
        <button
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`nav-btn ${activeTab === 'farm' ? 'active' : ''}`}
          onClick={() => setActiveTab('farm')}
        >
          Farm Profile
        </button>
        <button
          className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
          disabled={!farm}
        >
          Products
        </button>
        <button
          className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
          disabled={!farm}
        >
          Inventory
        </button>
        <button
          className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
          disabled={!farm}
        >
          Orders
        </button>
        <button
          className={`nav-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
          disabled={!farm}
        >
          Payouts
        </button>
        <button
          className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
          disabled={!farm}
        >
          Notifications
        </button>
      </div>

      <main className="dashboard-main">
        {!farm && activeTab !== 'farm' && (
          <div className="setup-prompt">
            <h2>Welcome! Let's set up your farm</h2>
            <p>Before you can add products, you need to create your farm profile.</p>
            <button className="btn-primary" onClick={() => setActiveTab('farm')}>
              Set Up Farm
            </button>
          </div>
        )}

        {activeTab === 'overview' && farm && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Farm</h3>
                <p className="stat-value">{farm.name}</p>
                <p className="stat-label">{farm.city}, {farm.state}</p>
              </div>
              <div className="stat-card">
                <h3>Products</h3>
                <p className="stat-value">{products.length}</p>
                <p className="stat-label">Total Products</p>
              </div>
              <div className="stat-card">
                <h3>Available</h3>
                <p className="stat-value">{products.filter(p => p.available).length}</p>
                <p className="stat-label">In Stock</p>
              </div>
              <div className="stat-card">
                <h3>Status</h3>
                <p className="stat-value">{farm.active ? 'Active' : 'Inactive'}</p>
                <p className="stat-label">Farm Status</p>
              </div>
            </div>

            <div className="recent-products">
              <h3>Your Products</h3>
              {products.length === 0 ? (
                <p>No products yet. <button className="link-btn" onClick={() => setActiveTab('products')}>Add your first product</button></p>
              ) : (
                <div className="product-preview">
                  {products.slice(0, 4).map(product => (
                    <div key={product.id} className="product-preview-card">
                      <span className="product-name">{product.name}</span>
                      <span className="product-price">${product.price}/{product.unit}</span>
                      <span className={`product-status ${product.available ? 'available' : 'unavailable'}`}>
                        {product.available ? 'Available' : 'Out of Stock'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'farm' && (
          <FarmSetup
            farm={farm}
            onFarmCreated={handleFarmCreated}
            onFarmUpdated={handleFarmUpdated}
          />
        )}

        {activeTab === 'products' && farm && (
          <div className="products-section">
            <div className="section-header">
              <h2>Products</h2>
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductForm(true);
                }}
              >
                Add Product
              </button>
            </div>

            {showProductForm && (
              <ProductForm
                product={editingProduct}
                onSubmit={editingProduct ? handleProductUpdated : handleProductCreated}
                onCancel={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
              />
            )}

            <ProductList
              products={products}
              onEdit={(product) => {
                setEditingProduct(product);
                setShowProductForm(true);
              }}
              onDelete={handleProductDeleted}
              onToggleAvailability={handleToggleAvailability}
            />
          </div>
        )}

        {activeTab === 'inventory' && farm && (
          <InventoryManager farm={farm} products={products} />
        )}

        {activeTab === 'orders' && farm && (
          <FarmerOrders />
        )}

        {activeTab === 'payouts' && farm && (
          <FarmerPayouts />
        )}

        {activeTab === 'notifications' && farm && (
          <NotificationCenter />
        )}
      </main>
    </div>
  );
};

export default FarmerDashboard;
