# Fix: PlatformConstants Native Module Error

## The Problem

The error "PlatformConstants' could not be found" indicates that the Expo project wasn't properly initialized. This happens when:
- Missing Expo configuration files (babel.config.js, metro.config.js)
- Expo SDK not properly linked
- Native modules not properly set up

## Fixes Applied

1. ✅ Added `babel.config.js` - Required for Expo/React Native
2. ✅ Added `metro.config.js` - Metro bundler configuration
3. ✅ Updated `tsconfig.json` - Better TypeScript configuration
4. ✅ Backend root endpoint added - Fixes 404 error

## Next Steps

### 1. Reinstall Dependencies

```bash
cd ui
rm -rf node_modules package-lock.json
npm install
```

### 2. Clear Expo Cache

```bash
npx expo start -c
```

The `-c` flag clears the cache, which is important after adding new config files.

### 3. If Still Having Issues

Try resetting the Expo project:

```bash
cd ui
rm -rf node_modules .expo
npm install
npx expo start -c
```

## Backend Fix

The backend 404 error is now fixed. The root endpoint (`/`) now returns:
```json
{
  "status": "ok",
  "message": "Zwigto API is running",
  "version": "1.0.0",
  "timestamp": "..."
}
```

Test it:
```bash
curl http://localhost:3000
```

## Why This Happened

When we copied files into the `ui/` folder, we didn't have all the necessary Expo configuration files. Expo requires:
- `babel.config.js` - For JavaScript/TypeScript transpilation
- `metro.config.js` - For the Metro bundler
- Proper `package.json` with correct Expo SDK version
- Proper `app.json` configuration

All of these are now in place!

