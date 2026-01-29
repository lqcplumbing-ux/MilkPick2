# MilkPick Database Schema Documentation

## Overview

The MilkPick database is designed for a farm-to-consumer milk subscription platform. It uses PostgreSQL (via Supabase) and includes tables for users, farms, products, subscriptions, orders, inventory, payments, and notifications.

## Entity Relationship Diagram (ERD) Description

```
Users (1) ----< (M) Farms
Users (1) ----< (M) Subscriptions
Users (1) ----< (M) Orders
Users (1) ----< (M) Payment Methods
Users (1) ----< (M) Surplus Alerts
Users (1) ----< (M) Notifications

Farms (1) ----< (M) Products
Farms (1) ----< (M) Subscriptions
Farms (1) ----< (M) Orders
Farms (1) ----< (M) Inventory
Farms (1) ----< (M) Surplus Alerts

Products (1) ----< (M) Subscriptions
Products (1) ----< (M) Orders
Products (1) ----< (M) Inventory
Products (1) ----< (M) Surplus Alerts

Subscriptions (1) ----< (M) Orders

Orders (1) ----< (M) Transactions
```

## Tables

### 1. users
Stores both customer and farmer accounts.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `email` (VARCHAR, UNIQUE): User email
- `password_hash` (VARCHAR): Hashed password
- `role` (VARCHAR): 'customer' or 'farmer'
- `phone` (VARCHAR): Phone number for notifications
- `first_name` (VARCHAR): User's first name
- `last_name` (VARCHAR): User's last name
- `created_at` (TIMESTAMP): Account creation time
- `updated_at` (TIMESTAMP): Last update time

**Indexes:**
- `idx_users_email`: Fast email lookups
- `idx_users_role`: Filter by user role

### 2. farms
Farm profiles managed by farmers.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `farmer_id` (UUID, FK → users): Farm owner
- `name` (VARCHAR): Farm name
- `description` (TEXT): Farm description
- `address`, `city`, `state`, `zip_code`: Location
- `phone`, `email`: Contact information
- `stripe_account_id` (VARCHAR): Stripe Connect account
- `active` (BOOLEAN): Farm operational status
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_farms_farmer_id`: Find farms by owner
- `idx_farms_active`: Filter active farms

### 3. products
Products offered by farms (milk, beef, etc.).

**Columns:**
- `id` (UUID, PK): Unique identifier
- `farm_id` (UUID, FK → farms): Parent farm
- `name` (VARCHAR): Product name
- `description` (TEXT): Product description
- `price` (DECIMAL): Price per unit
- `type` (VARCHAR): 'milk', 'beef', or 'other'
- `unit` (VARCHAR): Unit of measure (gallon, lb, etc.)
- `available` (BOOLEAN): Product availability
- `image_url` (TEXT): Product image URL
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_products_farm_id`: Products by farm
- `idx_products_type`: Filter by product type
- `idx_products_available`: Available products only

### 4. subscriptions
Recurring orders set up by customers.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `customer_id` (UUID, FK → users): Customer
- `farm_id` (UUID, FK → farms): Farm
- `product_id` (UUID, FK → products): Product
- `frequency` (VARCHAR): 'weekly', 'biweekly', 'monthly'
- `quantity` (INTEGER): Quantity per order
- `start_date` (DATE): Subscription start date
- `next_order_date` (DATE): Next scheduled order
- `active` (BOOLEAN): Subscription status
- `payment_method_id` (VARCHAR): Stripe payment method
- `stripe_subscription_id` (VARCHAR): Stripe subscription
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_subscriptions_customer_id`: Customer subscriptions
- `idx_subscriptions_farm_id`: Farm subscriptions
- `idx_subscriptions_active`: Active subscriptions
- `idx_subscriptions_next_order_date`: Upcoming orders

### 5. orders
Individual orders (from subscriptions or one-time).

**Columns:**
- `id` (UUID, PK): Unique identifier
- `subscription_id` (UUID, FK → subscriptions): Parent subscription (nullable)
- `customer_id` (UUID, FK → users): Customer
- `farm_id` (UUID, FK → farms): Farm
- `product_id` (UUID, FK → products): Product
- `quantity` (INTEGER): Order quantity
- `total_amount` (DECIMAL): Total price
- `scheduled_date` (DATE): Pickup date
- `status` (VARCHAR): 'pending', 'confirmed', 'picked_up', 'late', 'cancelled', 'no_show'
- `pickup_confirmed_at` (TIMESTAMP): Confirmation timestamp
- `confirmation_method` (VARCHAR): 'qr_code', 'farmer_manual', 'customer_self'
- `qr_code` (TEXT): QR code for pickup
- `payment_status` (VARCHAR): 'pending', 'paid', 'failed', 'refunded'
- `payment_intent_id` (VARCHAR): Stripe payment intent
- `notes` (TEXT): Order notes
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_orders_customer_id`: Customer orders
- `idx_orders_farm_id`: Farm orders
- `idx_orders_subscription_id`: Orders from subscription
- `idx_orders_scheduled_date`: Orders by date
- `idx_orders_status`: Filter by status
- `idx_orders_payment_status`: Filter by payment status

### 6. inventory
Daily inventory tracking for farms.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `farm_id` (UUID, FK → farms): Farm
- `product_id` (UUID, FK → products): Product
- `quantity` (DECIMAL): Current quantity
- `date` (DATE): Inventory date
- `is_surplus` (BOOLEAN): Surplus indicator
- `low_stock_threshold` (DECIMAL): Alert threshold
- `notes` (TEXT): Inventory notes
- `created_at`, `updated_at` (TIMESTAMP)

**Unique Constraint:** (farm_id, product_id, date)

**Indexes:**
- `idx_inventory_farm_id`: Farm inventory
- `idx_inventory_product_id`: Product inventory
- `idx_inventory_date`: Inventory by date
- `idx_inventory_is_surplus`: Surplus inventory

### 7. surplus_alerts
Customer opt-in for surplus notifications.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `farm_id` (UUID, FK → farms): Farm
- `product_id` (UUID, FK → products): Product
- `customer_id` (UUID, FK → users): Customer
- `opted_in` (BOOLEAN): Opt-in status
- `notified_at` (TIMESTAMP): Last notification time
- `claimed` (BOOLEAN): Surplus claimed
- `claimed_at` (TIMESTAMP): Claim timestamp
- `created_at`, `updated_at` (TIMESTAMP)

**Unique Constraint:** (farm_id, product_id, customer_id)

**Indexes:**
- `idx_surplus_alerts_farm_id`: Alerts by farm
- `idx_surplus_alerts_customer_id`: Customer alerts
- `idx_surplus_alerts_opted_in`: Active opt-ins

### 8. notifications
Log of all notifications sent.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `user_id` (UUID, FK → users): Recipient
- `type` (VARCHAR): 'sms' or 'email'
- `category` (VARCHAR): Notification category
- `recipient` (VARCHAR): Phone/email
- `subject` (VARCHAR): Email subject (nullable)
- `message` (TEXT): Notification content
- `status` (VARCHAR): 'sent', 'failed', 'pending'
- `sent_at` (TIMESTAMP): Send timestamp
- `error_message` (TEXT): Error details

**Indexes:**
- `idx_notifications_user_id`: User notifications
- `idx_notifications_type`: Filter by type
- `idx_notifications_status`: Filter by status

### 9. payment_methods
Customer payment methods (Stripe).

**Columns:**
- `id` (UUID, PK): Unique identifier
- `user_id` (UUID, FK → users): Customer
- `stripe_payment_method_id` (VARCHAR): Stripe PM ID
- `type` (VARCHAR): Payment type (card, etc.)
- `last_four` (VARCHAR): Last 4 digits
- `brand` (VARCHAR): Card brand
- `exp_month`, `exp_year` (INTEGER): Expiration
- `is_default` (BOOLEAN): Default payment method
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_payment_methods_user_id`: User payment methods

### 10. transactions
Payment transaction log.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `order_id` (UUID, FK → orders): Related order
- `customer_id` (UUID, FK → users): Customer
- `farm_id` (UUID, FK → farms): Farm
- `amount` (DECIMAL): Transaction amount
- `status` (VARCHAR): 'pending', 'succeeded', 'failed', 'refunded'
- `stripe_payment_intent_id` (VARCHAR): Stripe PI
- `stripe_charge_id` (VARCHAR): Stripe charge
- `refund_id` (VARCHAR): Refund ID
- `error_message` (TEXT): Error details
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_transactions_order_id`: Order transactions
- `idx_transactions_customer_id`: Customer transactions
- `idx_transactions_farm_id`: Farm transactions
- `idx_transactions_status`: Filter by status

### 11. settings
Configuration settings (farm-specific or global).

**Columns:**
- `id` (UUID, PK): Unique identifier
- `farm_id` (UUID, FK → farms): Farm (nullable for global)
- `key` (VARCHAR): Setting key
- `value` (TEXT): Setting value
- `created_at`, `updated_at` (TIMESTAMP)

**Unique Constraint:** (farm_id, key)

**Indexes:**
- `idx_settings_farm_id`: Settings by farm

## Triggers

All tables have `updated_at` triggers that automatically update the timestamp on row modification.

## Security

Row Level Security (RLS) is enabled on all tables. Policies should be configured based on:
- Users can only see/modify their own data
- Farmers can see/modify their own farms and products
- Public read access for farms and products catalog
- Restricted access to financial data

## Migration Notes

1. Run the schema.sql file in Supabase SQL Editor
2. Configure RLS policies based on security requirements
3. Set up Stripe webhook endpoints
4. Configure scheduled jobs for:
   - Order generation from subscriptions
   - Late pickup detection
   - Low inventory alerts

## Backup Strategy

- Daily automated backups via Supabase
- Point-in-time recovery enabled
- Export critical data weekly

---

**Last Updated:** 2026-01-27
