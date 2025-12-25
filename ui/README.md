# Zwigto Mobile App

React Native mobile app for Zwigto food ordering platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API URL in `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For physical device testing, use your computer's IP:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
```

3. Start the app:
```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app

## Project Structure

```
ui/
├── App.tsx              # Main app entry
├── package.json
├── tsconfig.json
├── .env                 # API URL configuration
├── src/
│   ├── screens/        # UI screens
│   │   ├── auth/
│   │   ├── user/
│   │   └── restaurant/
│   └── services/       # API service layer
│       ├── api-client.ts
│       ├── auth.service.ts
│       └── ...
└── shared/             # Shared DTOs and enums
    └── api-contracts/
```

## Prerequisites

- Backend server must be running (see parent directory README)
- Node.js 18+
- Expo CLI (installed automatically with npm)

## Development

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

