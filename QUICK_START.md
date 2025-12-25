# Quick Start Guide

## 🚀 Running the App

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

The `.env` file has been created with your database connection. You need to update:

1. **JWT_SECRET** - Already set with a default (change for production)
2. **SUPABASE_URL** - Get from your Supabase project settings
3. **SUPABASE_ANON_KEY** - Get from your Supabase project settings  
4. **SUPABASE_SERVICE_KEY** - Get from your Supabase project settings

To get Supabase credentials:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY`

### Step 3: Set Up Database Tables

1. Go to your Supabase project dashboard
2. Click on "SQL Editor"
3. Run the SQL script from `SETUP.md` (or see below for quick setup)

**Quick SQL Setup:**

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'RESTAURANT', 'ADMIN')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  payment_account VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'PAUSED', 'PENDING')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Restaurant users table
CREATE TABLE IF NOT EXISTS restaurant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

-- Restaurant change requests table
CREATE TABLE IF NOT EXISTS restaurant_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  requested_fields JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  prep_time_minutes INTEGER NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED')),
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_id UUID NOT NULL,
  route_polyline JSONB NOT NULL,
  pickup_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_users_user_id ON restaurant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
```

### Step 4: Enable Supabase Phone Auth

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Phone" provider
3. Configure SMS provider (or use test mode for development)

### Step 5: Run the Backend

```bash
# Development mode (recommended)
npm run start:dev
```

The server will start on `http://localhost:3000`

You should see:
```
Application is running on: http://localhost:3000
```

### Step 6: Test the API

Open a new terminal and test:

```bash
# Test server is running
curl http://localhost:3000

# Test OTP (replace with your phone number)
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with Supabase credentials
- [ ] Database tables created (SQL script run)
- [ ] PostGIS extension enabled
- [ ] Supabase Phone Auth enabled
- [ ] Server starts without errors
- [ ] Can send OTP (test endpoint)

## 🔧 Common Issues

### "Cannot connect to database"
- Check `DATABASE_URL` in `.env`
- Verify password is correct: `Ashashashash333`
- Check Supabase project is active

### "PostGIS extension not found"
- Run: `CREATE EXTENSION IF NOT EXISTS postgis;` in Supabase SQL Editor

### "Supabase Auth error"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Check Phone Auth is enabled in Supabase dashboard

### "JWT secret too short"
- Ensure `JWT_SECRET` is at least 32 characters

## 📝 Next Steps

1. Create an admin user (manually in database)
2. Test the complete flow:
   - Sign up → OTP verification
   - Create restaurant (as admin)
   - Search restaurants by route
   - Create order
   - Process payment
   - Complete order flow

## 🎯 Quick Commands Reference

```bash
# Install
npm install

# Run development server
npm run start:dev

# Build for production
npm run build

# Run production
npm run start:prod

# Check if server is running
curl http://localhost:3000
```

