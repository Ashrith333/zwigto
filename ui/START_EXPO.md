# How to Start Expo Development Server

## Quick Start

1. **Navigate to the UI directory:**
   ```bash
   cd /Users/ash/Desktop/Newapp/zwigto/ui
   ```

2. **Start Expo with tunnel mode (recommended for physical devices):**
   ```bash
   npx expo start --tunnel
   ```
   
   OR use LAN mode if on same WiFi:
   ```bash
   npx expo start --lan
   ```

3. **If you see a QR code:**
   - Open Expo Go app on your phone
   - Scan the QR code
   - The app should load

## Troubleshooting

### If "Could not connect to development server" error:

1. **Stop the current Expo server:**
   - Press `Ctrl+C` in the terminal running Expo

2. **Clear cache and restart:**
   ```bash
   npx expo start -c --tunnel
   ```
   The `-c` flag clears the cache

3. **Check your network:**
   - Make sure your phone and computer are on the same WiFi network
   - Or use tunnel mode (works across networks)

4. **Try different connection modes:**
   ```bash
   # Tunnel mode (works anywhere)
   npx expo start --tunnel
   
   # LAN mode (same WiFi only)
   npx expo start --lan
   
   # Localhost mode (simulator only)
   npx expo start --localhost
   ```

5. **If still not working:**
   - Check firewall settings
   - Try restarting your router
   - Use tunnel mode (most reliable)

## Current Setup

- **Backend API**: http://192.168.29.201:3000
- **Expo Dev Server**: Usually runs on port 8081
- **Frontend Code**: `/Users/ash/Desktop/Newapp/zwigto/ui`

## Notes

- Tunnel mode uses Expo's servers to connect your device (works on any network)
- LAN mode requires both devices on same WiFi
- The backend API URL is set in `ui/.env` as `EXPO_PUBLIC_API_URL`

