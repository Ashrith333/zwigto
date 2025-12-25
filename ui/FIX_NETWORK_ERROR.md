# Fix: Network Request Failed - Login/Signup

## The Problem

"Network request failed" happens when:
1. **No `.env` file** - API URL not configured
2. **Using `localhost`** - Won't work on physical device
3. **Backend not running** - Server not started
4. **Wrong IP address** - Computer and phone on different networks

## Quick Fix

### Step 1: Find Your Computer's IP Address

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

Look for something like: `192.168.1.XXX` or `192.168.29.XXX`

### Step 2: Update `.env` File

Edit `ui/.env` and replace `localhost` with your IP:

```env
# For physical device (use your computer's IP)
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000

# For iOS simulator/Android emulator (use localhost)
# EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Step 3: Make Sure Backend is Running

In a separate terminal:
```bash
cd /Users/ash/Desktop/Newapp/zwigto
npm run start:dev
```

You should see:
```
Application is running on: http://localhost:3000
```

### Step 4: Restart Expo

```bash
cd ui
npx expo start -c
```

## Important Notes

1. **Physical Device**: Must use your computer's IP address (not `localhost`)
2. **Simulator/Emulator**: Can use `localhost:3000`
3. **Same WiFi**: Phone and computer must be on the same WiFi network
4. **Firewall**: Make sure your firewall allows connections on port 3000

## Testing the Connection

Test if backend is accessible:
```bash
# From your computer
curl http://localhost:3000

# Should return:
# {"status":"ok","message":"Zwigto API is running",...}
```

## Troubleshooting

### Still getting "Network request failed"?

1. ✅ Check backend is running: `curl http://localhost:3000`
2. ✅ Verify IP address is correct in `.env`
3. ✅ Make sure phone and computer are on same WiFi
4. ✅ Try restarting Expo: `npx expo start -c`
5. ✅ Check firewall settings (allow port 3000)

### "Cannot connect to backend" error?

The error message now shows the API URL being used. Check:
- Is the URL correct?
- Is the backend running?
- Can you access it from your computer's browser?

