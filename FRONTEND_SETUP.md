# Frontend Setup Guide

## Overview

The frontend is a **React Native** app using **Expo**. The frontend code is in `src/screens/` and `src/services/`, but you need to set up a separate React Native/Expo project.

## Option 1: Create New Expo Project (Recommended)

### Step 1: Create Expo Project

```bash
# Install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Or use npx (no global install needed)
npx create-expo-app@latest zwigto-mobile

# Navigate to the new project
cd zwigto-mobile
```

### Step 2: Install Dependencies

```bash
# Install required packages
npm install @react-native-async-storage/async-storage
npm install react-native react-native-safe-area-context
npm install @react-navigation/native @react-navigation/stack
npm install expo-location  # For route/map features
npm install @react-native-community/google-maps  # For Google Maps (optional)

# For TypeScript support
npm install --save-dev typescript @types/react @types/react-native
```

### Step 3: Copy Frontend Files

Copy the frontend files from the backend project:

```bash
# From the backend project root
cp -r src/screens zwigto-mobile/src/
cp -r src/services zwigto-mobile/src/
cp -r shared zwigto-mobile/
```

### Step 4: Create App Entry Point

Create `App.tsx` in the root of `zwigto-mobile/`:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignupScreen } from './src/screens/auth/SignupScreen';
import { RouteSearchScreen } from './src/screens/user/RouteSearchScreen';
import { OrderHistoryScreen } from './src/screens/user/OrderHistoryScreen';
import { OrderManagementScreen } from './src/screens/restaurant/OrderManagementScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="RouteSearch" component={RouteSearchScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="OrderManagement" component={OrderManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Step 5: Configure Environment Variables

Create `.env` in `zwigto-mobile/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Or for physical device testing:
```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000
```

### Step 6: Update TypeScript Config

Create or update `tsconfig.json` in `zwigto-mobile/`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["src", "shared", "App.tsx"]
}
```

### Step 7: Run the App

```bash
# Start Expo development server
npx expo start

# Or use npm
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Option 2: Use Existing Expo Project

If you already have an Expo project:

1. Copy `src/screens/`, `src/services/`, and `shared/` folders
2. Install dependencies listed above
3. Update `App.tsx` with navigation
4. Set `EXPO_PUBLIC_API_URL` in `.env`

## Option 3: React Native CLI (Without Expo)

If you prefer React Native CLI:

```bash
# Create React Native project
npx react-native init ZwigtoMobile

# Install dependencies
cd ZwigtoMobile
npm install @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# Copy frontend files
cp -r ../zwigto/src/screens src/
cp -r ../zwigto/src/services src/
cp -r ../zwigto/shared ./

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android
```

## Backend Connection

Make sure your backend is running:

```bash
# In the backend project
npm run start:dev
```

The backend should be running on `http://localhost:3000`

## Testing on Physical Device

If testing on a physical device:

1. Find your computer's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
   ```

3. Make sure your phone and computer are on the same WiFi network

## Project Structure (After Setup)

```
zwigto-mobile/
├── App.tsx                 # Main app entry
├── package.json
├── tsconfig.json
├── .env                    # Environment variables
├── src/
│   ├── screens/           # UI screens
│   │   ├── auth/
│   │   ├── user/
│   │   └── restaurant/
│   └── services/          # API service layer
│       ├── api-client.ts
│       ├── auth.service.ts
│       └── ...
└── shared/                # Shared DTOs and enums
    └── api-contracts/
```

## Troubleshooting

### "Cannot find module" errors
- Make sure all dependencies are installed
- Check that `shared/` folder is copied correctly
- Verify TypeScript paths in `tsconfig.json`

### API connection errors
- Verify backend is running on `http://localhost:3000`
- Check `EXPO_PUBLIC_API_URL` in `.env`
- For physical devices, use your computer's IP address

### TypeScript errors
- Run `npx tsc --noEmit` to check for type errors
- Make sure `shared/api-contracts` types are accessible

## Next Steps

1. ✅ Set up Expo/React Native project
2. ✅ Copy frontend files
3. ✅ Install dependencies
4. ✅ Configure API URL
5. ✅ Test connection to backend
6. 🚀 Start building features!

