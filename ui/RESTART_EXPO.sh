#!/bin/bash
# Script to restart Expo development server

echo "🛑 Stopping any running Expo servers..."
pkill -f "expo start" || true
sleep 2

echo "🧹 Clearing Expo cache..."
cd /Users/ash/Desktop/Newapp/zwigto/ui
rm -rf .expo
rm -rf node_modules/.cache

echo "🚀 Starting Expo with tunnel mode (most reliable)..."
echo "   This will work even if devices are on different networks"
echo ""
npx expo start --tunnel -c

