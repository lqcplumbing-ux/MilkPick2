import React, { useEffect, useMemo, useState } from 'react';
import { inventoryAPI } from '../services/api';
import './InventoryManager.css';

const getToday = () => new Date().toISOString().slice(0, 10);

const InventoryManager = ({ farm, products }) => {
  const [inventoryDate, setInventoryDate] = useState(getToday());
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyRange, setHistoryRange] = useState({
    start: '',
    end: ''
  });
  const [historyProductId, setHistoryProductId] = useState('');

  const maxQuantity = useMemo(() => {
    const values = Object.values(drafts)
      .map((draft) => parseFloat(draft.quantity))
      .filter((value) => !Number.isNaN(value));
    return values.length ? Math.max(...values, 1) : 1;
  }, [drafts]);

  const lowStockCount = useMemo(() => {
    return Object.values(drafts).filter((draft) => {
      const quantity = parseFloat(draft.quantity);
      const threshold = parseFloat(draft.low_stock_threshold);
      if (Number.isNaN(quantity) || Number.isNaN(threshold)) {
        return false;
      }
      return quantity <= threshold;
    }).length;
  }, [drafts]);

  const loadInventory = async (date = inventoryDate) => {
    if (!farm || products.length === 0) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await inventoryAPI.getMyInventory({ date });
      const inventory = response.data.inventory || [];

      const nextDrafts = {};
      products.forEach((product) => {
        const entry = inventory.find((row) => row.product_id === product.id);
        nextDrafts[product.id] = {
          quantity: entry?.quantity ?? '',
          low_stock_threshold: entry?.low_stock_threshold ?? '',
          is_surplus: entry?.is_surplus ?? false,
          notes: entry?.notes ?? ''
        };
      });
      setDrafts(nextDrafts);
    } catch (loadError) {
      console.error('Error loading inventory:', loadError);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [farm?.id, inventoryDate, products]);

  const updateDraft = (productId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSave = async (product) => {
    const draft = drafts[product.id];
    if (!draft || draft.quantity === '') {
      setError('Quantity is required for each product.');
      return;
    }

    const quantity = parseFloat(draft.quantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      setError('Quantity must be a number greater than or equal to 0.');
      return;
    }

    const threshold = draft.low_stock_threshold === '' ? null : parseFloat(draft.low_stock_threshold);
    if (threshold !== null && (Number.isNaN(threshold) || threshold < 0)) {
      setError('Low stock threshold must be a number greater than or equal to 0.');
      return;
    }

    setSavingId(product.id);
    setError('');
    setSuccess('');

    try {
      await inventoryAPI.upsert({
        product_id: product.id,
        quantity,
        date: inventoryDate,
        is_surplus: !!draft.is_surplus,
        low_stock_threshold: threshold,
        notes: draft.notes?.trim() || null
      });

      setSuccess(`${product.name} saved.`);
      await loadInventory(inventoryDate);
    } catch (saveError) {
      console.error('Error saving inventory:', saveError);
      setError(saveError.response?.data?.error || 'Failed to save inventory');
    } finally {
      setSavingId(null);
    }
  };

  const handleLoadHistory = async () => {
    setHistoryLoading(true);
    setError('');

    const endDate = historyRange.end || inventoryDate || getToday();
    const end = new Date(endDate);
    const defaultStart = new Date(end);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const params = {
      start_date: historyRange.start || defaultStart.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10)
    };

    if (historyProductId) {
      params.product_id = historyProductId;
    }

    try {
      const response = await inventoryAPI.getHistory(params);
      setHistoryRows(response.data.history || []);
    } catch (historyError) {
      console.error('Error loading history:', historyError);
      setError('Failed to load inventory history');
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!farm) {
    return (
      <div className="inventory-empty">
        <p>Create your farm profile to manage inventory.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="inventory-empty">
        <p>Add products before tracking inventory.</p>
      </div>
    );
  }

  return (
    <div className="inventory-manager">
      <div className="inventory-header">
        <div>
          <h2>Inventory</h2>
          <p className="section-subtitle">Track stock levels and surplus for {farm.name}.</p>
        </div>
        <div className="inventory-date">
          <label htmlFor="inventory-date">Inventory Date</label>
          <input
            type="date"
            id="inventory-date"
            value={inventoryDate}
            onChange={(event) => setInventoryDate(event.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : (
        <>
          <div className="inventory-summary">
            <div className="summary-card">
              <h4>Products</h4>
              <p className="summary-value">{products.length}</p>
              <p className="summary-label">Tracked items</p>
            </div>
            <div className="summary-card">
              <h4>Low Stock</h4>
              <p className="summary-value">{lowStockCount}</p>
              <p className="summary-label">Need attention</p>
            </div>
            <div className="summary-card">
              <h4>Surplus</h4>
              <p className="summary-value">
                {Object.values(drafts).filter((draft) => draft.is_surplus).length}
              </p>
              <p className="summary-label">Marked surplus</p>
            </div>
          </div>

          <div className="inventory-grid">
            {products.map((product) => {
              const draft = drafts[product.id] || {};
              const quantityValue = parseFloat(draft.quantity);
              const thresholdValue = parseFloat(draft.low_stock_threshold);
              const isLowStock = !Number.isNaN(quantityValue)
                && !Number.isNaN(thresholdValue)
                && thresholdValue >= 0
                && quantityValue <= thresholdValue;
              const fillWidth = Number.isNaN(quantityValue)
                ? 0
                : Math.min((quantityValue / maxQuantity) * 100, 100);

              return (
                <div
                  key={product.id}
                  className={`inventory-card ${isLowStock ? 'low-stock' : ''}`}
                >
                  <div className="inventory-card-header">
                    <div>
                      <h3>{product.name}</h3>
                      <p className="inventory-meta">{product.type} · {product.unit}</p>
                    </div>
                    {draft.is_surplus && <span className="surplus-badge">Surplus</span>}
                  </div>

                  <div className="stock-bar">
                    <div className="stock-bar-fill" style={{ width: `${fillWidth}%` }} />
                  </div>
                  {isLowStock && <p className="low-stock-text">Low stock</p>}

                  <div className="inventory-fields">
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.quantity}
                        onChange={(event) => updateDraft(product.id, 'quantity', event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Low Stock Threshold</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.low_stock_threshold}
                        onChange={(event) => updateDraft(product.id, 'low_stock_threshold', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="inventory-fields">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={!!draft.is_surplus}
                        onChange={(event) => updateDraft(product.id, 'is_surplus', event.target.checked)}
                      />
                      Mark as surplus
                    </label>
                    <textarea
                      placeholder="Notes (optional)"
                      rows="2"
                      value={draft.notes}
                      onChange={(event) => updateDraft(product.id, 'notes', event.target.value)}
                    />
                  </div>

                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => handleSave(product)}
                    disabled={savingId === product.id}
                  >
                    {savingId === product.id ? 'Saving...' : 'Save Inventory'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="inventory-history">
        <div className="history-header">
          <h3>Inventory History</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>

        {showHistory && (
          <div className="history-panel">
            <div className="history-filters">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={historyRange.start}
                  onChange={(event) => setHistoryRange((prev) => ({ ...prev, start: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={historyRange.end}
                  onChange={(event) => setHistoryRange((prev) => ({ ...prev, end: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Product</label>
                <select
                  value={historyProductId}
                  onChange={(event) => setHistoryProductId(event.target.value)}
                >
                  <option value="">All Products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleLoadHistory}
                disabled={historyLoading}
              >
                {historyLoading ? 'Loading...' : 'Load History'}
              </button>
            </div>

            {historyRows.length === 0 ? (
              <div className="empty-state">
                <p>No history available for the selected range.</p>
              </div>
            ) : (
              <div className="history-table">
                <div className="history-row history-header-row">
                  <span>Date</span>
                  <span>Product</span>
                  <span>Quantity</span>
                  <span>Low Stock</span>
                  <span>Surplus</span>
                </div>
                {historyRows.map((row) => (
                  <div key={row.id} className="history-row">
                    <span>{row.date}</span>
                    <span>{row.products?.name || 'Product'}</span>
                    <span>{row.quantity}</span>
                    <span>{row.low_stock_threshold ?? '-'}</span>
                    <span>{row.is_surplus ? 'Yes' : 'No'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManager;
