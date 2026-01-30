require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { generateOrdersForDueSubscriptions } = require('./services/subscriptionService');
const { markLateOrders } = require('./services/pickupService');
const { sendPickupReminders, sendWeeklyCustomerSummaries, sendWeeklyFarmerSummaries } = require('./services/notificationService');
const paymentController = require('./controllers/paymentController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Stripe webhook needs raw body
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'MilkPick API is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/farms', require('./routes/farms'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: { message: 'File too large. Max size is 5MB.' }
    });
  }
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.listen(PORT, () => {
  console.log(`MilkPick API server running on port ${PORT}`);
});

if (process.env.ENABLE_SCHEDULER !== 'false') {
  cron.schedule('0 2 * * *', () => {
    generateOrdersForDueSubscriptions()
      .then((result) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Scheduler: created ${result.created}, updated ${result.updated}`);
        }
      })
      .catch((error) => {
        console.error('Scheduler error:', error.message);
      });
  });

  cron.schedule('15 * * * *', () => {
    markLateOrders()
      .then((result) => {
        if (process.env.NODE_ENV !== 'production' && result.updated > 0) {
          console.log(`Scheduler: marked ${result.updated} orders late`);
        }
      })
      .catch((error) => {
        console.error('Late pickup scheduler error:', error.message);
      });
  });

  cron.schedule('0 8 * * *', () => {
    sendPickupReminders()
      .then(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Scheduler: pickup reminders sent');
        }
      })
      .catch((error) => {
        console.error('Pickup reminder scheduler error:', error.message);
      });
  });

  cron.schedule('0 9 * * 1', () => {
    Promise.all([sendWeeklyCustomerSummaries(), sendWeeklyFarmerSummaries()])
      .then(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Scheduler: weekly summaries sent');
        }
      })
      .catch((error) => {
        console.error('Weekly summary scheduler error:', error.message);
      });
  });
}

module.exports = app;
