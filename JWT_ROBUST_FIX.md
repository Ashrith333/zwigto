# JWT Token Robust Fix - Invalid Signature Resolution

## Problem
The error "invalid signature" indicates that the JWT_SECRET used to **sign** tokens is different from the one used to **verify** them. This happens when:
- JwtModule and JwtStrategy read `process.env.JWT_SECRET` at different times
- Environment variables aren't loaded consistently
- Multiple instances of the secret exist in memory

## Solution: Centralized JWT Configuration

Created a **single source of truth** for JWT configuration that both signing and verification use.

### New File: `src/auth/config/jwt.config.ts`
- **Singleton pattern**: Ensures the same secret is always used
- **Early initialization**: Loads and validates JWT_SECRET immediately
- **Explicit dotenv loading**: Forces environment variable loading
- **Verification method**: Allows checking config status

### Changes Made

1. **`src/auth/config/jwt.config.ts`** (NEW)
   - Centralized JWT configuration
   - Ensures same secret for signing and verification
   - Provides verification and status methods

2. **`src/auth/auth.module.ts`**
   - Now uses `JwtConfig.getSecret()` instead of reading `process.env` directly
   - Initializes config before module registration

3. **`src/auth/strategies/jwt.strategy.ts`**
   - Now uses `JwtConfig.getSecret()` instead of reading `process.env` directly
   - Ensures same secret as JwtModule

4. **`src/main.ts`**
   - Explicitly initializes JwtConfig before app bootstrap
   - Logs JWT configuration status on startup

5. **`src/app.controller.ts`**
   - Health endpoint now uses `JwtConfig.verify()` for accurate status

## How It Works

1. **On Application Start**:
   ```
   main.ts → dotenv.config() → JwtConfig.initialize()
   ```

2. **JwtConfig.initialize()**:
   - Loads `JWT_SECRET` from environment
   - Stores it in a static variable
   - Validates and logs status

3. **Token Signing** (AuthService):
   - Calls `JwtConfig.getSecret()` → gets same secret every time

4. **Token Verification** (JwtStrategy):
   - Calls `JwtConfig.getSecret()` → gets same secret every time

## Required Actions

### 1. Restart Backend (MANDATORY)
```bash
# Stop backend (Ctrl+C)
# Start again:
npm run start:dev
```

### 2. Check Startup Logs
You should see:
```
🔐 JWT Configuration Status: { valid: true, secretPreview: 'f8nUqV6MP0...', expiresIn: '1h' }
✅ JWT Config initialized with secret: f8nUqV6MP0...
✅ JWT expires in: 1h
✅ JWT Strategy initialized with secret: f8nUqV6MP0...
✅ AuthModule initialized with JWT config: { secretConfigured: true, ... }
```

### 3. Verify Health Endpoint
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "jwt": {
    "valid": true,
    "secretPreview": "f8nUqV6MP0...",
    "expiresIn": "1h"
  }
}
```

### 4. Log Out and Log Back In
- Old tokens were signed with potentially different secret
- New tokens will use the centralized secret
- Both signing and verification now use the same source

## Why This Fixes "Invalid Signature"

**Before**:
- JwtModule reads `process.env.JWT_SECRET` → might get value A
- JwtStrategy reads `process.env.JWT_SECRET` → might get value B (or undefined)
- Token signed with A, verified with B → **invalid signature**

**After**:
- JwtConfig.initialize() reads `process.env.JWT_SECRET` once → stores value X
- JwtModule.getSecret() → returns X
- JwtStrategy.getSecret() → returns X
- Token signed with X, verified with X → **valid signature** ✅

## Troubleshooting

### If still getting "invalid signature":

1. **Check .env file exists and has JWT_SECRET**:
   ```bash
   cat .env | grep JWT_SECRET
   ```

2. **Verify JWT_SECRET is loaded**:
   ```bash
   node check-jwt-secret.js
   ```

3. **Check backend logs** for:
   - `🔐 JWT Configuration Status` - should show `valid: true`
   - `✅ JWT Config initialized` - should show secret preview
   - If you see warnings about default secret, JWT_SECRET isn't loaded

4. **Restart backend completely**:
   - Kill all node processes
   - Start fresh: `npm run start:dev`

5. **Clear old tokens**:
   - Log out from app
   - Clear AsyncStorage if needed
   - Log back in to get fresh token

## Benefits

✅ **Single source of truth** - No more secret mismatches  
✅ **Early validation** - Catches config issues at startup  
✅ **Better logging** - Clear visibility into JWT config status  
✅ **Robust** - Handles edge cases and missing env vars gracefully  
✅ **Verifiable** - Health endpoint shows exact config status  

