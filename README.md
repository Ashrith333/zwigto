# Zwigto - Pickup-First Food Ordering Platform

## Architecture Overview

Zwigto is a modular, scalable food ordering platform built with:
- **Backend**: NestJS (modular monolith)
- **Frontend**: React Native (Android + iOS)
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Payments**: Razorpay (UPI-first)

## Project Structure

```
zwigto/
├── src/                    # Backend (NestJS)
│   ├── admin/             # Admin operations
│   ├── auth/              # Authentication
│   ├── geo/               # Route-based restaurant search
│   ├── menus/             # Menu management
│   ├── orders/            # Order management
│   ├── payments/          # Payment processing
│   ├── restaurants/       # Restaurant management
│   ├── reviews/           # Reviews and ratings
│   └── users/             # User profiles
├── shared/
│   └── api-contracts/     # Shared DTOs and enums (used by both frontend and backend)
└── src/                   # Frontend (React Native)
    ├── screens/           # UI screens
    ├── services/          # API service layer
    └── components/        # Reusable components
```

## Key Architectural Principles

1. **Mobile apps NEVER access database directly** - All data access via backend APIs
2. **Screens ONLY call service layer** - No direct fetch() calls in UI
3. **Backend modules are isolated** - No cross-module service imports
4. **Shared contracts** - Frontend and backend use same DTOs from `shared/api-contracts`
5. **Controllers orchestrate only** - Business logic lives in services
6. **No business logic in UI** - All logic in service layer

## Getting Started

### Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (`.env`):
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

3. Start the server:
```bash
npm run start:dev
```

### Frontend Setup

The frontend is a **React Native** app using **Expo**. The frontend code is in this repository, but you need to create a separate Expo project.

**Quick Start:**
1. See `FRONTEND_QUICK_START.md` for step-by-step setup (5 minutes)
2. Or see `FRONTEND_SETUP.md` for detailed instructions

**Summary:**
```bash
# 1. Create Expo project (in parent directory)
cd ..
npx create-expo-app@latest zwigto-mobile --template blank-typescript
cd zwigto-mobile

# 2. Install dependencies
npm install @react-native-async-storage/async-storage @react-navigation/native @react-navigation/stack

# 3. Copy frontend files from backend project
cp -r ../zwigto/src/screens ./src/
cp -r ../zwigto/src/services ./src/
cp -r ../zwigto/shared ./

# 4. Create .env file
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env

# 5. Start Expo (make sure backend is running first)
npx expo start
```

**Note:** The frontend code (`src/screens/`, `src/services/`) is in this repository, but you need to set up a separate Expo/React Native project to run it.

## API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to phone
- `POST /auth/verify-otp` - Verify OTP and get token
- `POST /auth/login` - Login with password
- `POST /auth/set-password` - Set password after OTP

### Users
- `GET /users/me` - Get authenticated user profile

### Restaurants
- `POST /restaurants` - Create restaurant (Admin only)
- `GET /restaurants/:id` - Get restaurant profile
- `PATCH /restaurants/:id` - Update restaurant (Restaurant user/Admin)
- `POST /restaurants/:id/change-requests` - Submit change request (Restaurant user)

### Menus
- `POST /restaurants/:id/menu-items` - Create menu item
- `GET /restaurants/:id/menu-items` - List menu items
- `GET /restaurants/:id/menu-items/:itemId` - Get menu item
- `PATCH /restaurants/:id/menu-items/:itemId` - Update menu item
- `DELETE /restaurants/:id/menu-items/:itemId` - Delete menu item

### Geo
- `POST /geo/restaurants` - Find eligible restaurants along route

### Orders
- `POST /orders` - Create order (User)
- `GET /orders/me` - Get user's orders
- `GET /orders/:id` - Get order
- `PATCH /orders/:id/status` - Update order status (Restaurant user/Admin)
- `PATCH /orders/:id/pickup` - Complete pickup (User)

### Payments
- `POST /payments` - Create payment intent
- `GET /payments/:id` - Get payment
- `POST /payments/webhook` - Razorpay webhook handler

### Reviews
- `POST /reviews` - Create review (User, after pickup)
- `PATCH /reviews/:id` - Update review (User, within 24h)
- `GET /reviews/:id` - Get review
- `GET /reviews/restaurant/:id` - Get restaurant reviews
- `GET /reviews/restaurant/:id/rating` - Get restaurant rating

### Admin
- `POST /admin/change-requests/:id/approve` - Approve change request
- `POST /admin/change-requests/:id/reject` - Reject change request
- `PATCH /admin/restaurants/:id/pause` - Pause restaurant
- `PATCH /admin/orders/:id/cancel` - Cancel order
- `POST /admin/payments/:id/refund` - Refund payment

## End-to-End Flows

### User Signup/Login
1. User enters phone → OTP sent
2. User enters OTP → Account created/authenticated
3. User sets password → Can login with password

### Route Search → Order
1. User enters route (A → B) + buffer time
2. System finds eligible restaurants
3. User selects restaurant → Views menu
4. User adds items → Creates payment
5. User pays → Creates order
6. Restaurant accepts → Prepares → Marks ready
7. User picks up → Marks picked up
8. User rates order

### Restaurant Management
1. Restaurant user logs in
2. Views pending orders
3. Accepts/rejects orders
4. Updates order status (Preparing → Ready)
5. Submits change requests for sensitive fields

### Admin Operations
1. Admin approves restaurant onboarding
2. Admin approves/rejects change requests
3. Admin can pause restaurants
4. Admin can cancel orders and trigger refunds

## Development Guidelines

### Backend
- Keep modules isolated
- Use shared contracts for DTOs
- Business logic in services only
- Controllers orchestrate only

### Frontend
- Screens call services only
- Services use shared contracts
- Handle loading/error/success states
- No business logic in UI

### Shared Contracts
- Define all request/response types
- Define all enums
- No business logic
- Used by both frontend and backend

## Testing

Run backend tests:
```bash
npm test
```

Run frontend tests:
```bash
npm test
```

## Deployment

### Backend
- Deploy to your preferred Node.js hosting (AWS, Heroku, etc.)
- Set environment variables
- Ensure database is accessible

### Frontend
- Build for iOS/Android
- Configure API URL for production
- Deploy to App Store/Play Store

## License

UNLICENSED
