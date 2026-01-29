# MilkPick - Product Requirements Document (PRD)

## 1. Objective

Automate and simplify milk scheduling for farms, eliminating manual calendar tracking and streamlining the farm-to-consumer milk subscription process.

## 2. Target Users

### Customers
- Place and manage recurring milk orders
- Receive notifications about pickups and availability
- Manage payment methods
- Confirm pickups
- Opt-in to surplus alerts

### Farmers
- Manage availability and schedules
- Track inventory levels
- Confirm customer pickups
- Manage product catalog (milk, beef, other products)
- View customer orders and payment status

## 3. Core Features

### 3.1 Recurring Scheduling
- Customers can set up recurring milk orders (weekly, bi-weekly, monthly)
- Automated scheduling based on customer preferences
- Calendar view for both customers and farmers

### 3.2 Order Management
- Customers can modify upcoming orders
- Customers can cancel orders
- Cancellation policies and grace periods
- Order history tracking

### 3.3 Surplus Queue
- Opt-in alert system for customers interested in surplus inventory
- Farmers can mark surplus availability
- First-come-first-served or priority queue system
- Notifications sent to opted-in customers

### 3.4 Inventory Tracking
- Real-time inventory management for farmers
- Track milk quantities
- Low stock alerts
- Surplus indicators

### 3.5 Upsells & Additional Products
- Beef products
- Other farm products
- Product catalog management
- Add-ons to regular orders

### 3.6 Online Payments
- Stripe integration for payment processing
- Recurring payment management
- Payment history
- Refund handling
- Multiple payment methods support

## 4. Pickup Confirmation System

Multiple verification methods to ensure successful pickups:

### 4.1 QR Code Scan
- Unique QR code per order
- Scannable by farmer or customer
- Instant confirmation

### 4.2 Farmer Manual Confirmation
- Farmer can manually mark orders as picked up
- Web/mobile interface

### 4.3 Customer Self-Confirm Button
- Customer can confirm their own pickup
- Simple button interface

### 4.4 Grace Period & Late Pickup Handling
- Configurable grace period before flagging late pickups
- Automated reminders
- Late pickup notifications to both parties

## 5. Notifications

### 5.1 SMS Notifications (Twilio)
- Order confirmations
- Pickup reminders
- Surplus alerts
- Late pickup warnings
- Schedule changes

### 5.2 Email Notifications (SendGrid)
- Order receipts
- Weekly schedule summaries
- Payment confirmations
- Account updates
- Marketing communications (opt-in)

## 6. Tech Stack

### Frontend
- **Framework**: React
- **State Management**: Context API or Redux (TBD)
- **Styling**: TBD (Tailwind CSS, Material-UI, etc.)
- **Routing**: React Router

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Authentication**: JWT or session-based (TBD)
- **API Design**: RESTful

### Database
- **Platform**: Supabase
- **Type**: PostgreSQL
- **Features**: Real-time subscriptions, authentication, storage

### Third-Party Integrations
- **Payments**: Stripe
- **SMS**: Twilio
- **Email**: SendGrid

## 7. Pricing Model

**Baseline**: $100/month per farm

Additional considerations:
- Transaction fees (if applicable)
- Tiered pricing based on customer volume (future)
- Feature-based pricing tiers (future)

## 8. User Flows

### 8.1 Customer Signup & Ordering
1. Customer creates account
2. Browse available products
3. Set up recurring schedule
4. Add payment method
5. Confirm subscription
6. Receive confirmation notifications

### 8.2 Farmer Product Management
1. Farmer logs in
2. Update inventory levels
3. Set availability calendar
4. Manage product catalog
5. View upcoming orders

### 8.3 Pickup Process
1. Customer arrives for pickup
2. Scan QR code OR farmer confirms OR customer self-confirms
3. System marks order as completed
4. Payment processes (if not already processed)
5. Both parties receive confirmation

## 9. Data Models (High-Level)

### Users
- id, email, password, role (customer/farmer), phone, created_at

### Farms
- id, farmer_id, name, address, contact_info, stripe_account_id

### Products
- id, farm_id, name, description, price, type (milk/beef/other), available

### Subscriptions
- id, customer_id, farm_id, frequency, start_date, active, payment_method_id

### Orders
- id, subscription_id, customer_id, farm_id, scheduled_date, status, pickup_confirmed_at, confirmation_method

### Inventory
- id, farm_id, product_id, quantity, date

### SurplusAlerts
- id, farm_id, product_id, customer_id, opted_in, notified_at

## 10. Security & Compliance

- Secure payment handling via Stripe (PCI compliance)
- Password hashing
- HTTPS/SSL for all communications
- Data privacy compliance
- User data protection

## 11. Future Enhancements

- Mobile apps (iOS/Android)
- Route optimization for deliveries
- Customer reviews and ratings
- Referral program
- Multi-farm marketplace
- Analytics dashboard
- Automated billing and invoicing
- Loyalty programs

## 12. Success Metrics

- Number of active farms
- Number of active customers per farm
- Order completion rate
- Payment success rate
- Customer retention rate
- Average revenue per farm
- Pickup confirmation rate

---

**Document Version**: 1.0
**Last Updated**: 2026-01-27
