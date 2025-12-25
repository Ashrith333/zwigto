# How to Run the Frontend

## Prerequisites

✅ **Backend must be running first!**
```bash
# In the backend project (zwigto/)
npm run start:dev
```

The backend should be running on `http://localhost:3000`

## Option 1: Quick Setup (Recommended)

Follow `FRONTEND_QUICK_START.md` for a 5-minute setup.

## Option 2: Manual Setup

### Step 1: Create Expo Project

```bash
# Go to parent directory
cd ..

# Create Expo project
npx create-expo-app@latest zwigto-mobile --template blank-typescript

# Enter the project
cd zwigto-mobile
```

### Step 2: Install Required Packages

```bash
npm install @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

### Step 3: Copy Frontend Files

```bash
# Copy screens, services, and shared contracts
cp -r ../zwigto/src/screens ./src/
cp -r ../zwigto/src/services ./src/
cp -r ../zwigto/shared ./
```

### Step 4: Create App.tsx

Replace `App.tsx` with navigation setup (see `FRONTEND_QUICK_START.md` for full code).

### Step 5: Configure API URL

Create `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Step 6: Run the App

```bash
npx expo start
```

**Then:**
- Press `i` for iOS simulator
- Press `a` for Android emulator  
- Scan QR code with Expo Go app on your phone

## Testing on Physical Device

1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. **Update `.env`:**
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
   ```

3. **Make sure:**
   - Phone and computer are on the same WiFi network
   - Backend is running and accessible
   - Firewall allows connections on port 3000

## Troubleshooting

### "Cannot connect to backend"
- ✅ Verify backend is running: `curl http://localhost:3000`
- ✅ Check `EXPO_PUBLIC_API_URL` in `.env`
- ✅ For physical device: Use IP address, not `localhost`

### "Module not found"
- ✅ Run `npm install` again
- ✅ Clear cache: `npx expo start -c`
- ✅ Verify files were copied correctly

### TypeScript errors
- ✅ Check that `shared/` folder exists
- ✅ Verify import paths in screens/services

## Project Structure

```
zwigto-mobile/          # New Expo project
├── App.tsx
├── package.json
├── .env
├── src/
│   ├── screens/       # Copied from zwigto/src/screens/
│   └── services/      # Copied from zwigto/src/services/
└── shared/            # Copied from zwigto/shared/

zwigto/                # Backend project (this repo)
├── src/
│   ├── screens/       # Frontend code (reference)
│   ├── services/      # Frontend code (reference)
│   └── ...            # Backend modules
└── shared/            # Shared contracts
```

## Next Steps

1. ✅ Backend running
2. ✅ Frontend running
3. 🚀 Test login/signup flow
4. 🚀 Build features!

