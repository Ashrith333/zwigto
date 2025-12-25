# Unified Sign In / Sign Up Flow

## Overview

Implemented a unified authentication flow where sign in and sign up happen in the same screen.

## How It Works

### Flow Logic:

1. **User enters phone (+91 default) and password**
2. **Backend checks:**
   - If user exists AND has password → Verify password → Login ✅
   - If user doesn't exist OR has no password → Send OTP → Show OTP screen
3. **User enters OTP**
4. **Backend verifies OTP and:**
   - Creates account (if new user) OR updates existing user
   - Sets password
   - Logs user in automatically ✅

## Backend Changes

### New Endpoint: `POST /auth/unified-auth`

**Request:**
```json
{
  "phone": "+919876543210",
  "password": "userpassword",
  "otp": "123456"  // Optional, only needed for signup
}
```

**Response (if OTP required):**
```json
{
  "message": "OTP sent successfully. Please verify to complete signup.",
  "requiresOtp": true
}
```

**Response (if login successful):**
```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user-id",
    "phone": "+919876543210",
    "role": "USER"
  }
}
```

## Frontend Changes

### New Screen: `UnifiedAuthScreen`

- **Single screen** for both sign in and sign up
- **Phone field** defaults to `+91`
- **Password field** always required
- **Two-step flow:**
  1. Enter phone + password → Submit
  2. If OTP required → Enter OTP → Verify

### Features:

- ✅ Auto-formats phone number with +91
- ✅ Smart flow detection (login vs signup)
- ✅ Clear UI feedback at each step
- ✅ Handles both existing and new users seamlessly

## User Experience

### Existing User (Has Password):
1. Enter phone: `+919876543210`
2. Enter password: `mypassword`
3. Click "Continue"
4. ✅ **Logged in immediately!**

### New User (No Account):
1. Enter phone: `+919876543210`
2. Enter password: `mypassword`
3. Click "Continue"
4. OTP sent → Enter OTP
5. ✅ **Account created and logged in!**

### Existing User (No Password):
1. Enter phone: `+919876543210`
2. Enter password: `mypassword`
3. Click "Continue"
4. OTP sent → Enter OTP
5. ✅ **Password set and logged in!**

## Benefits

- ✅ **Simpler UX** - One screen, one flow
- ✅ **No confusion** - Users don't need to choose "Sign In" vs "Sign Up"
- ✅ **Seamless** - Works for both new and existing users
- ✅ **Secure** - OTP verification for new accounts
- ✅ **Password-first** - Users set password during signup, no need for OTP next time

## Testing

1. **Test existing user login:**
   - Use a phone number that already has an account with password
   - Should login immediately

2. **Test new user signup:**
   - Use a new phone number
   - Should send OTP, then create account

3. **Test phone formatting:**
   - Try entering without +91
   - Should auto-add +91

## Files Changed

- ✅ `src/auth/auth.service.ts` - Added `unifiedAuth()` method
- ✅ `src/auth/auth.controller.ts` - Added `POST /auth/unified-auth` endpoint
- ✅ `src/auth/dto/unified-auth.dto.ts` - New DTO
- ✅ `shared/api-contracts/auth.dto.ts` - Added unified auth types
- ✅ `ui/src/services/auth.service.ts` - Added `unifiedAuth()` method
- ✅ `ui/src/screens/auth/UnifiedAuthScreen.tsx` - New unified screen
- ✅ `ui/App.tsx` - Updated to use UnifiedAuthScreen

The old LoginScreen and SignupScreen are still available but not used in the main flow.

