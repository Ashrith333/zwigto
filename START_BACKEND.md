# Start Backend Server

## The Problem

The backend server is **not running**, which is why you're getting "cannot connect to backend" error.

## Quick Fix

### Start the Backend Server

```bash
cd /Users/ash/Desktop/Newapp/zwigto
npm run start:dev
```

You should see:
```
[Nest] Starting Nest application...
Application is running on: http://localhost:3000
```

### Keep It Running

**Important:** Keep this terminal window open and the server running. The backend must be running for the frontend to work.

## Verify It's Working

### Test 1: Backend Health Check
Open a new terminal and run:
```bash
curl http://localhost:3000
```

Should return:
```json
{"status":"ok","message":"Zwigto API is running",...}
```

### Test 2: Test from Phone
1. Make sure phone and computer are on same WiFi
2. Open browser on phone
3. Go to: `http://192.168.29.201:3000`
4. Should see the same JSON response

## Database Connection

The database password has been updated to: `Ashashashash333`

If you still see circuit breaker errors:
1. **Wait 5-10 minutes** for it to reset
2. **OR** try direct connection (port 5432) instead of pooler (6543)

To use direct connection, update `.env`:
```env
DATABASE_URL=postgresql://postgres:Ashashashash333@db.lreibhelpqsfnefnthtc.supabase.co:5432/postgres
```

## Complete Setup

1. ✅ Database password fixed in `.env`
2. ✅ Frontend API URL configured (`http://192.168.29.201:3000`)
3. ⚠️ **Backend needs to be started** - Run `npm run start:dev`

## Running Both Frontend and Backend

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd /Users/ash/Desktop/Newapp/zwigto
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/ash/Desktop/Newapp/zwigto/ui
npx expo start
```

Both must be running simultaneously!

