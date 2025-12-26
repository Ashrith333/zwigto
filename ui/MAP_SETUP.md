# Map Setup Instructions

## Issue Fixed
- Replaced `react-native-maps` (requires native code) with `expo-maps` (Expo-compatible)
- The `expo-maps` plugin has been automatically added to `app.json`

## Important: Rebuild Required

**For Expo Go users**: `expo-maps` requires a **development build**. You cannot use it with Expo Go.

### Option 1: Create Development Build (Recommended)
```bash
cd ui
npx expo prebuild
npx expo run:ios  # or npx expo run:android
```

### Option 2: Use Expo Go with Fallback
The current implementation includes a fallback that shows coordinates and "Get Current Location" button when the map can't load. This works in Expo Go.

## Current Implementation

The `MapPickerScreen` now:
- Uses `ExpoMap` from `expo-maps` for iOS/Android
- Shows a placeholder on web
- Includes "Get Current Location" button that works everywhere
- Displays coordinates and address
- Allows manual coordinate entry

## Testing

1. **With Development Build**: Map should load and be interactive
2. **With Expo Go**: Map won't load, but you can still:
   - Use "Get Current Location" button
   - Manually enter coordinates
   - See address via reverse geocoding

## Next Steps

If you want full map functionality:
1. Create a development build: `npx expo prebuild && npx expo run:ios`
2. Or use EAS Build: `eas build --profile development`

The location features (Get Current Location, coordinate entry) work in both Expo Go and development builds.

