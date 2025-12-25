# Frontend Quick Start

## Prerequisites

- Node.js 18+ installed
- Backend server running (see `RUN.md`)
- Expo CLI (will be installed automatically)

## Quick Setup (5 minutes)

### 1. Create Expo Project

```bash
# Navigate to parent directory (or wherever you want the mobile app)
cd ..

# Create new Expo project
npx create-expo-app@latest zwigto-mobile --template blank-typescript

# Navigate into the project
cd zwigto-mobile
```

### 2. Install Dependencies

```bash
npm install @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

### 3. Copy Frontend Files

```bash
# From zwigto-mobile directory, copy files from backend project
cp -r ../zwigto/src/screens ./src/
cp -r ../zwigto/src/services ./src/
cp -r ../zwigto/shared ./
```

### 4. Create App.tsx

Replace the default `App.tsx` with:

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

### 5. Create .env File

Create `.env` in `zwigto-mobile/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**For physical device testing**, use your computer's IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000
```

Find your IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

### 6. Install Expo Environment Variables

```bash
npm install --save-dev @expo/config-plugins
```

### 7. Start the App

```bash
# Make sure backend is running first (in another terminal)
# cd ../zwigto && npm run start:dev

# Then start Expo
npx expo start
```

**Options:**
- Press `i` - Open iOS simulator (requires Xcode on macOS)
- Press `a` - Open Android emulator (requires Android Studio)
- Scan QR code - Open in Expo Go app on your phone

## Project Structure

```
zwigto-mobile/
├── App.tsx              # Main entry point
├── package.json
├── .env                 # API URL configuration
├── src/
│   ├── screens/        # UI screens (copied from backend project)
│   └── services/       # API services (copied from backend project)
└── shared/             # Shared DTOs (copied from backend project)
```

## Troubleshooting

### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start -c
```

### Backend connection fails
- Verify backend is running: `curl http://localhost:3000`
- Check `EXPO_PUBLIC_API_URL` in `.env`
- For physical device: Use your computer's IP address, not `localhost`

### TypeScript errors
- Make sure `shared/` folder is copied correctly
- Check that all imports in screens/services point to correct paths

## Next Steps

1. ✅ Frontend is running
2. ✅ Backend is running
3. 🚀 Test the login flow
4. 🚀 Build your features!

## Development Tips

- Use Expo Go app on your phone for quick testing
- Hot reload is enabled by default
- Check Expo DevTools in browser for logs
- Use React Native Debugger for advanced debugging

