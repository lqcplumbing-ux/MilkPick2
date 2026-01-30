import React, { useEffect, useMemo, useState } from 'react';
import QrReader from 'react-qr-scanner';
import { farmerOrderAPI } from '../services/api';
import './FarmerOrders.css';

const FarmerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: 'all',
    search: '',
    upcoming: 'true'
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState('');
  const [scanActive, setScanActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        status: filters.status === 'all' ? undefined : filters.status,
        search: filters.search || undefined,
        upcoming: filters.upcoming
      };
      const response = await farmerOrderAPI.getFarmOrders(params);
      setOrders(response.data.orders || []);
    } catch (loadError) {
      console.error('Error loading farmer orders:', loadError);
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const params = {
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined
      };
      const response = await farmerOrderAPI.getStats(params);
      setStats(response.data.stats);
    } catch (statsError) {
      console.error('Error loading order stats:', statsError);
    } finally {
      setStatsLoading(false);
    }
  };

  const updateOrderInState = (updatedOrder) => {
    setOrders((prev) => prev.map((order) => (
      order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
    )));
    setSelectedOrder((prev) => (
      prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev
    ));
  };

  const canConfirm = (order) => !['picked_up', 'cancelled', 'no_show'].includes(order.status);

  const formatConfirmationMethod = (method) => {
    switch (method) {
      case 'qr_code':
        return 'QR Scan';
      case 'farmer_manual':
        return 'Farmer Manual';
      case 'customer_self':
        return 'Customer Self';
      default:
        return 'Confirmed';
    }
  };

  useEffect(() => {
    loadOrders();
    loadStats();
  }, []);

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

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    loadOrders();
    loadStats();
  };

  const handleReset = () => {
    const defaults = {
      start_date: '',
      end_date: '',
      status: 'all',
      search: '',
      upcoming: 'true'
    };
    setFilters(defaults);
    setTimeout(() => {
      loadOrders();
      loadStats();
    }, 0);
  };

  const handleConfirmPickup = async () => {
    if (!selectedOrder) {
      return;
    }
    if (!window.confirm('Confirm pickup for this order?')) {
      return;
    }
    setConfirming(true);
    setActionError('');
    try {
      const response = await farmerOrderAPI.confirmPickup(selectedOrder.id);
      updateOrderInState(response.data.order);
      await loadOrders();
      await loadStats();
    } catch (confirmError) {
      console.error('Error confirming pickup:', confirmError);
      setActionError('Failed to confirm pickup.');
    } finally {
      setConfirming(false);
    }
  };

  const handleScan = async (data) => {
    if (!data || scanLoading) {
      return;
    }
    const scannedValue = typeof data === 'string' ? data : data?.text;
    if (!scannedValue) {
      return;
    }
    if (scannedValue === lastScan) {
      return;
    }
    setLastScan(scannedValue);
    setScanLoading(true);
    setScanError('');
    try {
      const response = await farmerOrderAPI.scanQr({ code: scannedValue });
      updateOrderInState(response.data.order);
      await loadOrders();
      await loadStats();
      setScanActive(false);
    } catch (scanErr) {
      console.error('QR scan error:', scanErr);
      setScanError('Failed to confirm pickup with QR code.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanError = (err) => {
    console.error('QR scanner error:', err);
    setScanError('Camera error. Please check permissions or use manual confirmation.');
  };

  const exportCsv = () => {
    const header = ['Date', 'Product', 'Quantity', 'Unit', 'Status', 'Customer', 'Email', 'Phone', 'Total'];
    const rows = orders.map((order) => {
      const customer = order.customers || {};
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
      return [
        order.scheduled_date,
        order.products?.name || '',
        order.quantity,
        order.products?.unit || '',
        order.status,
        customerName,
        customer.email || '',
        customer.phone || '',
        order.total_amount
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farm-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="farmer-orders">
      <div className="orders-header">
        <div>
          <h2>Orders</h2>
          <p className="section-subtitle">Review upcoming pickups, customer info, and order status.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            name="start_date"
            value={filters.start_date}
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            name="end_date"
            value={filters.end_date}
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
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
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Customer or product"
          />
        </div>
        <div className="filter-group">
          <label>View</label>
          <select name="upcoming" value={filters.upcoming} onChange={handleFilterChange}>
            <option value="true">Upcoming</option>
            <option value="false">All Orders</option>
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-primary" onClick={handleApply}>Apply Filters</button>
          <button className="btn-secondary" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {statsLoading ? (
        <div className="loading">Loading stats...</div>
      ) : stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Orders</h4>
            <p className="stat-value">{stats.total}</p>
          </div>
          <div className="stat-card">
            <h4>Upcoming</h4>
            <p className="stat-value">{stats.upcoming}</p>
          </div>
          <div className="stat-card">
            <h4>Pending</h4>
            <p className="stat-value">{stats.pending}</p>
          </div>
          <div className="stat-card">
            <h4>Revenue</h4>
            <p className="stat-value">${stats.revenue?.toFixed(2)}</p>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders match the current filters.</p>
        </div>
      ) : (
        <div className="orders-list">
          {Object.keys(groupedOrders).sort().map((date) => (
            <div key={date} className="order-day-card">
              <h4>{date}</h4>
              {groupedOrders[date].map((order) => {
                const customer = order.customers || {};
                const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
                return (
                  <button
                    key={order.id}
                    className="order-row"
                    onClick={() => {
                      setSelectedOrder(order);
                      setScanActive(false);
                      setScanError('');
                      setActionError('');
                      setLastScan('');
                    }}
                  >
                    <div>
                      <span className="order-product">{order.products?.name || 'Product'}</span>
                      <span className="order-customer">{customerName}</span>
                    </div>
                    <div className="order-meta">
                      <span>{order.quantity} {order.products?.unit || ''}</span>
                      <span className={`status-pill ${order.status}`}>{order.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="order-modal">
            <div className="modal-header">
              <div>
                <h3>Order Details</h3>
                <p>{selectedOrder.scheduled_date}</p>
              </div>
              <button
                className="btn-link"
                onClick={() => {
                  setSelectedOrder(null);
                  setScanActive(false);
                  setScanError('');
                  setActionError('');
                  setLastScan('');
                }}
              >
                Close
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-section">
                <h4>Product</h4>
                <p>{selectedOrder.products?.name}</p>
                <p>{selectedOrder.quantity} {selectedOrder.products?.unit}</p>
              </div>
              <div className="modal-section">
                <h4>Status</h4>
                <p className={`status-pill ${selectedOrder.status}`}>{selectedOrder.status}</p>
                {selectedOrder.pickup_confirmed_at && (
                  <p className="confirmation-detail">
                    {formatConfirmationMethod(selectedOrder.confirmation_method)} - {' '}
                    {new Date(selectedOrder.pickup_confirmed_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="modal-section">
                <h4>Customer</h4>
                <p>{selectedOrder.customers?.first_name} {selectedOrder.customers?.last_name}</p>
                <p>{selectedOrder.customers?.email}</p>
                <p>{selectedOrder.customers?.phone}</p>
              </div>
              {selectedOrder.notes && (
                <div className="modal-section">
                  <h4>Notes</h4>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
              <div className="modal-section">
                <h4>Pickup Confirmation</h4>
                <div className="modal-actions">
                  <button
                    className="btn-primary"
                    onClick={handleConfirmPickup}
                    disabled={!canConfirm(selectedOrder) || confirming}
                  >
                    {confirming ? 'Confirming...' : 'Confirm Pickup'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setScanActive((prev) => !prev);
                      setScanError('');
                      setLastScan('');
                    }}
                    disabled={!canConfirm(selectedOrder)}
                  >
                    {scanActive ? 'Stop Scan' : 'Scan QR'}
                  </button>
                </div>
                {actionError && <div className="inline-error">{actionError}</div>}
                {scanActive && (
                  <div className="qr-scanner">
                    <QrReader
                      delay={300}
                      style={{ width: '100%' }}
                      onError={handleScanError}
                      onScan={handleScan}
                      facingMode="rear"
                    />
                    {scanLoading && <p className="scan-status">Scanning...</p>}
                    {scanError && <div className="inline-error">{scanError}</div>}
                    <p className="scan-hint">Camera access requires HTTPS or localhost.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerOrders;
