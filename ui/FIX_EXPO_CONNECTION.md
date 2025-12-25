# Fix Expo Connection Issue

## Problem
Tunnel mode requires ngrok which is having installation issues. Use LAN mode instead (simpler and faster).

## Solution: Use LAN Mode

1. **Stop any running Expo servers:**
   ```bash
   pkill -f "expo start"
   ```

2. **Start Expo with LAN mode:**
   ```bash
   cd /Users/ash/Desktop/Newapp/zwigto/ui
   npx expo start --lan -c
   ```

3. **Make sure your phone and computer are on the same WiFi network**

4. **Scan the QR code** that appears in the terminal

## Alternative: Use Localhost (for Simulator Only)

If you're using iOS Simulator or Android Emulator:
```bash
npx expo start --localhost
```

## If LAN Mode Doesn't Work

1. **Check your computer's IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Make sure firewall allows port 8081:**
   - macOS: System Settings > Network > Firewall
   - Allow Node.js or Expo through firewall

3. **Try clearing cache:**
   ```bash
   cd /Users/ash/Desktop/Newapp/zwigto/ui
   rm -rf .expo
   rm -rf node_modules/.cache
   npx expo start --lan -c
   ```

## Current Network Info

- Your computer IP: Check with `ifconfig`
- Backend API: http://192.168.29.201:3000 (set in `.env`)
- Expo Dev Server: Usually port 8081

## Quick Start Command

```bash
cd /Users/ash/Desktop/Newapp/zwigto/ui && npx expo start --lan -c
```

