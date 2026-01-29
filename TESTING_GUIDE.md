# MilkPick Testing Guide

This guide covers how to test the implemented features of MilkPick.

## Prerequisites

Before testing, ensure you have:
1. ✓ Supabase project created
2. ✓ Database tables created (ran schema.sql)
3. ✓ Backend dependencies installed (`npm install` in backend/)
4. ✓ Frontend dependencies installed (`npm install` in frontend/)
5. ⚠️ **IMPORTANT**: Supabase service role key added to backend/.env

## Complete Environment Setup

### Get Supabase Service Role Key

The service role key was NOT added during initial setup. You need to add it now:

1. Go to your Supabase Dashboard
2. Navigate to: Settings → API
3. Scroll down to find the **"service_role" key** (it's secret, don't share it!)
4. Copy it

5. Edit `backend/.env` and replace line 8:
   ```env
   SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
   ```
   With your actual service role key:
   ```env
   SUPABASE_SERVICE_KEY=eyJhbGc... (your actual key)
   ```

6. Save the file

## Phase 2: Authentication Testing

### Backend API Testing

#### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
MilkPick API server running on port 5000
```

#### 2. Test User Registration

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"farmer@test.com\",\"password\":\"Test1234\",\"role\":\"farmer\",\"first_name\":\"John\",\"last_name\":\"Farmer\"}"
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "farmer@test.com",
    "role": "farmer",
    "first_name": "John",
    "last_name": "Farmer"
  },
  "token": "eyJhbGc..."
}
```

#### 3. Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"farmer@test.com\",\"password\":\"Test1234\"}"
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGc..."
}
```

#### 4. Test Get Current User (Protected Route)

Replace `YOUR_TOKEN` with the token from login/register:

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "farmer@test.com",
    "role": "farmer",
    "first_name": "John",
    "last_name": "Farmer"
  }
}
```

### Frontend UI Testing

#### 1. Start the Frontend Server

In a new terminal:
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

#### 2. Test Signup Flow

1. Open browser: http://localhost:3000/signup
2. Fill in the form:
   - Select role: Customer or Farmer
   - Enter first name, last name
   - Enter email
   - Enter phone (optional)
   - Enter password (must be 8+ chars with uppercase, lowercase, number)
   - Confirm password
3. Click "Sign Up"
4. You should be redirected to the Dashboard

#### 3. Test Login Flow

1. Open: http://localhost:3000/login
2. Enter email and password
3. Click "Login"
4. You should be redirected to the Dashboard

#### 4. Test Protected Routes

1. Try accessing http://localhost:3000/dashboard without logging in
2. You should be redirected to /login
3. After logging in, you can access the dashboard

#### 5. Test Logout

1. On the Dashboard, click "Logout"
2. You should be redirected to login page
3. Your token is cleared from localStorage

### Test Different User Roles

Create users with different roles:

**Customer Account:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"customer@test.com\",\"password\":\"Test1234\",\"role\":\"customer\",\"first_name\":\"Jane\",\"last_name\":\"Customer\"}"
```

**Farmer Account:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"farmer@test.com\",\"password\":\"Test1234\",\"role\":\"farmer\",\"first_name\":\"John\",\"last_name\":\"Farmer\"}"
```

Login as each and verify the Dashboard shows role-specific content.

## Troubleshooting

### Error: "Invalid API key"

**Problem**: Supabase service role key is not set or incorrect.

**Solution**:
1. Check `backend/.env` line 8
2. Make sure you copied the **service_role** key, not the anon key
3. Restart the backend server after updating .env

### Error: "Failed to create user"

**Possible causes**:
1. Invalid Supabase credentials
2. Database tables not created
3. User already exists with that email

**Solutions**:
1. Verify Supabase URL and keys in .env
2. Re-run the schema.sql in Supabase SQL Editor
3. Try a different email address

### Error: "EADDRINUSE: address already in use"

**Problem**: Port 5000 or 3000 is already in use.

**Solution (Windows)**:
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill //F //PID <PID>
```

### Frontend can't connect to backend

**Problem**: CORS or connection issues.

**Solutions**:
1. Make sure backend is running on port 5000
2. Check `frontend/.env` has correct API URL
3. CORS is already configured in backend

### Password validation fails

Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Example valid passwords: `Test1234`, `Password123`, `Welcome1`

## What's Working (Phase 2)

✓ User Registration (customer/farmer)
✓ User Login with JWT
✓ Protected Routes
✓ Role-based access control
✓ Profile viewing
✓ Logout
✓ Password hashing
✓ Token-based authentication

## What's Coming Next (Phase 3)

- Farm profile creation (farmers)
- Product management (farmers)
- Farm browsing (customers)
- Product catalog
- Image uploads

---

**Last Updated**: 2026-01-27
