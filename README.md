# MilkPick

Farm-to-consumer milk subscription platform that automates scheduling, payments, and pickups.

## Project Overview

MilkPick eliminates manual calendar tracking for farms by providing:
- Automated recurring milk orders
- Flexible pickup confirmation (QR codes, manual, self-confirm)
- Integrated payments via Stripe
- SMS and email notifications
- Inventory tracking and surplus alerts
- Product upsells (beef and other farm products)

## Tech Stack

### Frontend
- React 18
- Vite
- React Router
- Stripe React SDK
- Supabase JS Client

### Backend
- Node.js
- Express
- Supabase (PostgreSQL)
- Stripe
- Twilio (SMS)
- SendGrid (Email)

## Project Structure

```
MilkPick/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── PRD.md                  # Product Requirements Document
├── ROADMAP.md              # Development roadmap
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Stripe account
- Twilio account (for SMS)
- SendGrid account (for Email)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MilkPick
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy the environment variables template:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- Supabase credentials
- JWT secret (generate a secure random string)
- Stripe API keys
- Twilio credentials
- SendGrid API key

Start the backend server:
```bash
npm run dev
```

The API will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Copy the environment variables template:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- Supabase URL and anon key
- Stripe publishable key
- API URL (default: http://localhost:5000/api)

Start the frontend development server:
```bash
npm run dev
```

The app will run on `http://localhost:3000`

### 4. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API
3. Run the database migrations (see Database Schema section)

### 5. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Enable Stripe Connect for farmer payouts
3. Get your API keys from the Stripe Dashboard
4. Set up webhook endpoints for payment events

### 6. Third-Party Services Setup

#### Twilio (SMS)
1. Sign up at [twilio.com](https://twilio.com)
2. Get a phone number for sending SMS
3. Copy Account SID and Auth Token to your `.env`

#### SendGrid (Email)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Verify your sender email address
4. Copy API key to your `.env`

## Database Schema

See [ROADMAP.md](ROADMAP.md) Phase 1 for detailed schema design.

The database includes tables for:
- Users (customers and farmers)
- Farms
- Products
- Subscriptions
- Orders
- Inventory
- SurplusAlerts
- Payments

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

### Farms
- `POST /api/farms` - Create farm (farmers only)
- `GET /api/farms` - List all farms
- `GET /api/farms/:id` - Get farm details
- `PUT /api/farms/:id` - Update farm (owner only)

### Products
- `POST /api/products` - Create product (farmers only)
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `POST /api/products/:id/image` - Upload product image
- `DELETE /api/products/:id` - Delete product

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions` - List user subscriptions
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Cancel subscription
- `GET /api/subscriptions/preview` - Preview upcoming schedule

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/upcoming` - List upcoming orders
- `PUT /api/orders/:id` - Update upcoming order (date/quantity/notes)
- `PATCH /api/orders/:id/cancel` - Cancel upcoming order
- `GET /api/orders/farm` - List orders for farmer's farm
- `GET /api/orders/farm/stats` - Order stats for farmer
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/confirm` - Confirm pickup
- `GET /api/orders/:id/qr` - Get QR code

### Inventory
- `POST /api/inventory` - Create/update inventory
- `GET /api/inventory/my-farm` - Get current farm inventory
- `GET /api/inventory/farm/:farmId` - Get farm inventory (owner only)
- `GET /api/inventory/history` - Get inventory history
- `GET /api/inventory/low-stock` - Get low stock items

### Payments
- `POST /api/payments/setup-intent` - Create payment setup
- `POST /api/payments/webhook` - Stripe webhook handler

## Development Roadmap

See [ROADMAP.md](ROADMAP.md) for the complete development roadmap with 12 phases.

**Current Phase**: Phase 8 - Pickup Confirmation System

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

Deployment instructions will be added in Phase 12.

## Contributing

1. Follow the roadmap phases in order
2. Write tests for new features
3. Follow existing code style and structure
4. Update documentation as needed

## License

ISC

## Support

For questions or issues, please refer to the PRD.md or ROADMAP.md documents.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-29
