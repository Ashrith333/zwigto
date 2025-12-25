# Fix: Cannot Connect to Backend

## Issues Found

1. ✅ **Database password fixed** - Updated from `Ashashash333` to `Ashashashash333` in `.env`
2. ⚠️ **Backend connection** - Need to verify backend is running and accessible

## What I Fixed

### 1. Database Password ✅
Updated `.env` file with correct password:
```env
DATABASE_URL=postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

### 2. Frontend API URL ✅
Already configured correctly:
```env
EXPO_PUBLIC_API_URL=http://192.168.29.201:3000
```

## Next Steps

### Step 1: Restart Backend Server

The backend needs to be restarted to pick up the new database password:

```bash
# Stop the current server (Ctrl+C in the terminal running npm run start:dev)
# Then restart:
cd /Users/ash/Desktop/Newapp/zwigto
npm run start:dev
```

### Step 2: Verify Backend is Running

Test if backend is accessible:

```bash
# From your computer
curl http://localhost:3000

# Should return:
# {"status":"ok","message":"Zwigto API is running",...}
```

### Step 3: Test from Phone/Device

1. Make sure your phone and computer are on the **same WiFi network**
2. Try accessing `http://192.168.29.201:3000` from your phone's browser
3. You should see the API response

### Step 4: Restart Expo (if needed)

```bash
cd ui
npx expo start -c
```

## Alternative: Use Direct Connection

If the pooler (port 6543) still has issues, try the direct connection:

Update `.env`:
```env
DATABASE_URL=postgresql://postgres:Ashashashash333@db.lreibhelpqsfnefnthtc.supabase.co:5432/postgres
```

Then restart the backend.

## Troubleshooting

### "Cannot connect to backend" error

1. ✅ **Check backend is running:**
   ```bash
   curl http://localhost:3000
   ```

2. ✅ **Check firewall:**
   - Make sure port 3000 is not blocked
   - macOS: System Settings → Firewall → Allow incoming connections

3. ✅ **Verify IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Make sure it matches `192.168.29.201` in `ui/.env`

4. ✅ **Same WiFi network:**
   - Phone and computer must be on the same WiFi
   - Try disconnecting and reconnecting both devices

### Database still not connecting

1. **Wait for circuit breaker** - If you see "Circuit breaker open", wait 5-10 minutes
2. **Try direct connection** - Use port 5432 instead of 6543
3. **Verify password** - Double-check in Supabase Dashboard

## Current Configuration

- **Backend Database URL**: `postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
- **Frontend API URL**: `http://192.168.29.201:3000`
- **Your IP**: `192.168.29.201`

## Test Commands

```bash
# Test backend locally
curl http://localhost:3000

# Test backend from network IP
curl http://192.168.29.201:3000

# Test database connection
node test-db-connection.js
```

After restarting the backend with the correct password, the connection should work!

