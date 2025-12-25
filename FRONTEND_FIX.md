# Fix: Cannot Run Expo from Backend Directory

## The Problem

You're trying to run `npx expo start` from the **backend project directory** (`zwigto/`). This won't work because:

- This is a **NestJS backend project**, not an Expo/React Native project
- Expo needs to be run from a **separate Expo project directory**
- The frontend code exists here but needs to be in its own project to run

## The Solution

You have **two options**:

### Option 1: Use the Setup Script (Easiest)

Run the automated setup script:

```bash
# From the backend project directory
./SETUP_FRONTEND.sh
```

This will:
1. Create a new Expo project in `../zwigto-mobile/`
2. Install all required dependencies
3. Copy frontend files from this project
4. Set up navigation and configuration
5. Create `.env` file

Then run:
```bash
cd ../zwigto-mobile
npx expo start
```

### Option 2: Manual Setup

Follow the steps in `FRONTEND_QUICK_START.md`:

```bash
# 1. Go to parent directory
cd ..

# 2. Create Expo project
npx create-expo-app@latest zwigto-mobile --template blank-typescript

# 3. Enter the project
cd zwigto-mobile

# 4. Install dependencies
npm install @react-native-async-storage/async-storage @react-navigation/native @react-navigation/stack

# 5. Copy frontend files
cp -r ../zwigto/src/screens ./src/
cp -r ../zwigto/src/services ./src/
cp -r ../zwigto/shared ./

# 6. Create .env
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env

# 7. Create App.tsx (see FRONTEND_QUICK_START.md for full code)

# 8. Run Expo
npx expo start
```

## Important Notes

1. **Backend and Frontend are Separate Projects:**
   - Backend: `/Users/ash/Desktop/Newapp/zwigto/` (NestJS)
   - Frontend: `/Users/ash/Desktop/Newapp/zwigto-mobile/` (Expo)

2. **Backend Must Run First:**
   ```bash
   # In backend directory
   cd /Users/ash/Desktop/Newapp/zwigto
   npm run start:dev
   ```

3. **Then Run Frontend:**
   ```bash
   # In frontend directory
   cd /Users/ash/Desktop/Newapp/zwigto-mobile
   npx expo start
   ```

## Quick Reference

```bash
# Backend commands (from zwigto/)
npm run start:dev          # Start backend server

# Frontend commands (from zwigto-mobile/)
npx expo start             # Start Expo dev server
```

## Project Structure After Setup

```
Newapp/
├── zwigto/                # Backend (NestJS) - THIS DIRECTORY
│   ├── src/
│   │   ├── screens/      # Frontend code (reference)
│   │   ├── services/     # Frontend code (reference)
│   │   └── ...           # Backend modules
│   └── package.json
│
└── zwigto-mobile/         # Frontend (Expo) - NEW DIRECTORY
    ├── App.tsx
    ├── src/
    │   ├── screens/      # Copied from zwigto/src/screens/
    │   └── services/     # Copied from zwigto/src/services/
    ├── shared/           # Copied from zwigto/shared/
    └── package.json
```

## Still Having Issues?

1. Make sure you're in the correct directory
2. Check that Expo project was created successfully
3. Verify all files were copied correctly
4. See `FRONTEND_QUICK_START.md` for detailed troubleshooting

