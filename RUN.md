# How to Run Zwigto

## ✅ Current Setup Status

- ✅ Database URL configured: `postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
- ✅ `.env` file created with database connection
- ✅ Backend code ready

## 🚀 Step-by-Step Run Instructions

### 1. Install Dependencies (First Time Only)

```bash
npm install
```

This will install all required packages including:
- NestJS framework
- PostgreSQL driver (pg)
- Supabase client
- Razorpay SDK
- JWT and authentication libraries

### 2. Update Environment Variables

Edit `.env` file and add your Supabase credentials:

```env
# Get these from Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
```

**How to get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" → "API"
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

### 3. Set Up Database Tables

1. Go to Supabase Dashboard → SQL Editor
2. Copy and run the SQL script from `SETUP.md` or `QUICK_START.md`
3. This creates all required tables (users, restaurants, orders, etc.)

**Important:** Also run this to enable PostGIS:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4. Enable Supabase Phone Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Phone" provider
3. Enable it
4. Configure SMS provider (or use test mode for development)

### 5. Start the Server

```bash
npm run start:dev
```

You should see:
```
[Nest] Starting Nest application...
Application is running on: http://localhost:3000
```

### 6. Test the API

Open a new terminal and test:

```bash
# Test if server is running
curl http://localhost:3000

# Test OTP sending (replace phone number)
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

## 📋 Complete Command Sequence

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Verify .env file exists
cat .env

# 3. Start the server
npm run start:dev
```

## 🔍 Verify Everything Works

After starting the server, you should see:
- ✅ "Database connection established" messages
- ✅ "Application is running on: http://localhost:3000"
- ✅ No error messages

## ⚠️ Troubleshooting

### Error: "Cannot find module"
**Solution:** Run `npm install`

### Error: "Database connection failed"
**Solution:** 
- Check `.env` file has correct `DATABASE_URL`
- Verify password: `Ashashashash333`
- Check Supabase project is active

### Error: "PostGIS extension not found"
**Solution:** Run in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Error: "Supabase configuration is missing"
**Solution:** Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

### Port 3000 already in use
**Solution:** Change `PORT=3001` in `.env` or kill the process using port 3000

## 🎯 What's Next?

Once the server is running:

1. **Test Authentication:**
   - Send OTP: `POST /auth/send-otp`
   - Verify OTP: `POST /auth/verify-otp`

2. **Create Admin User:**
   - Manually insert in database or via Supabase dashboard
   - Set role to 'ADMIN'

3. **Test Complete Flow:**
   - Sign up → Create restaurant → Add menu → Create order → Process payment

## 📚 Additional Resources

- `SETUP.md` - Detailed setup instructions
- `QUICK_START.md` - Quick reference guide
- `README.md` - Full documentation

