import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, isFarmer, isCustomer } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>MilkPick Dashboard</h1>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Welcome back, {user?.first_name || user?.email}!</h2>
          <div className="user-info">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> <span className={`role-badge ${user?.role}`}>{user?.role}</span></p>
            {user?.phone && <p><strong>Phone:</strong> {user.phone}</p>}
          </div>
        </div>

        <div className="dashboard-content">
          {isFarmer && (
            <div className="dashboard-section">
              <h3>Farmer Dashboard</h3>
              <p>Welcome to your farmer dashboard! Here you'll be able to:</p>
              <ul>
                <li>Manage your farm profile</li>
                <li>Add and edit products (milk, beef, etc.)</li>
                <li>Track inventory levels</li>
                <li>View and confirm orders</li>
                <li>Manage surplus alerts</li>
              </ul>
              <p className="coming-soon">These features will be available in upcoming phases.</p>
            </div>
          )}

          {isCustomer && (
            <div className="dashboard-section">
              <h3>Customer Dashboard</h3>
              <p>Welcome to your customer dashboard! Here you'll be able to:</p>
              <ul>
                <li>Browse local farms and products</li>
                <li>Set up recurring milk orders</li>
                <li>Manage your subscriptions</li>
                <li>View order history</li>
                <li>Opt-in for surplus alerts</li>
                <li>Confirm pickups with QR codes</li>
              </ul>
              <p className="coming-soon">These features will be available in upcoming phases.</p>
            </div>
          )}
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <h4>Current Phase</h4>
            <p className="stat-value">Phase 10</p>
            <p className="stat-label">Notification System</p>
          </div>
          <div className="stat-card">
            <h4>Account Status</h4>
            <p className="stat-value">Active</p>
            <p className="stat-label">Verified</p>
          </div>
          <div className="stat-card">
            <h4>Next Steps</h4>
            <p className="stat-value">Phase 11</p>
            <p className="stat-label">Surplus Queue</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
