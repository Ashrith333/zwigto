#!/bin/bash

# Frontend Setup Script for Zwigto
# This script creates a new Expo project and copies frontend files

set -e

echo "🚀 Setting up Zwigto Frontend..."
echo ""

# Get the backend project directory
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$BACKEND_DIR")"
FRONTEND_DIR="$PARENT_DIR/zwigto-mobile"

echo "Backend directory: $BACKEND_DIR"
echo "Frontend directory: $FRONTEND_DIR"
echo ""

# Check if frontend directory already exists
if [ -d "$FRONTEND_DIR" ]; then
    echo "⚠️  Frontend directory already exists: $FRONTEND_DIR"
    read -p "Do you want to remove it and start fresh? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing frontend directory..."
        rm -rf "$FRONTEND_DIR"
    else
        echo "Exiting. Please remove or rename the existing directory."
        exit 1
    fi
fi

# Create Expo project
echo "📦 Creating Expo project..."
cd "$PARENT_DIR"
npx create-expo-app@latest zwigto-mobile --template blank-typescript

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Install required dependencies
echo ""
echo "📥 Installing dependencies..."
npm install @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# Copy frontend files
echo ""
echo "📋 Copying frontend files..."
mkdir -p src
cp -r "$BACKEND_DIR/src/screens" ./src/
cp -r "$BACKEND_DIR/src/services" ./src/
cp -r "$BACKEND_DIR/shared" ./

# Create .env file
echo ""
echo "⚙️  Creating .env file..."
cat > .env << EOF
EXPO_PUBLIC_API_URL=http://localhost:3000
EOF

# Create App.tsx with navigation
echo ""
echo "📝 Creating App.tsx..."
cat > App.tsx << 'EOF'
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
EOF

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Make sure backend is running: cd $BACKEND_DIR && npm run start:dev"
echo "   2. Start Expo: cd $FRONTEND_DIR && npx expo start"
echo ""
echo "💡 For physical device testing, update .env with your computer's IP address:"
echo "   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000"
echo ""

