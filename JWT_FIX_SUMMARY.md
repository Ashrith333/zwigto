# JWT Token Fix Summary

## Issues Fixed

### 1. JWT Payload Standardization
**Problem**: Tokens were using `id` field instead of JWT standard `sub` (subject)

**Fix**: Changed all token signing to use `sub: user.id` instead of `id: user.id`

**Files Changed**:
- `src/auth/auth.service.ts`:
  - `verifyOtp()` - now uses `sub`
  - `login()` - now uses `sub`
  - `unifiedAuth()` - now uses `sub` (both login and signup paths)

### 2. JWT Strategy Validation
**Problem**: Strategy was expecting `payload.id` but tokens now use `payload.sub`

**Fix**: Updated `JwtStrategy.validate()` to:
- Support both `sub` (JWT standard) and `id` (backward compatibility)
- Map `payload.sub` → `userId` → return `UserPayload` with `id` field
- Added comprehensive logging for debugging

**Files Changed**:
- `src/auth/strategies/jwt.strategy.ts`

### 3. JWT_SECRET Verification
**Problem**: No clear indication if JWT_SECRET was loaded correctly

**Fix**: Added warnings and better logging:
- `JwtModule` logs secret preview on initialization
- `JwtStrategy` logs secret preview on initialization
- Both warn if `JWT_SECRET` is not set in environment

**Files Changed**:
- `src/auth/auth.module.ts`
- `src/auth/strategies/jwt.strategy.ts`

## Token Structure

### Before (Incorrect)
```json
{
  "id": "user-uuid",
  "phone": "+919676936825",
  "role": "USER"
}
```

### After (Correct - JWT Standard)
```json
{
  "sub": "user-uuid",
  "phone": "+919676936825",
  "role": "USER"
}
```

## Validation Flow

1. **Token Extraction**: `ExtractJwt.fromAuthHeaderAsBearerToken()` extracts token from `Authorization: Bearer <token>`
2. **Token Verification**: Uses `JWT_SECRET` from environment (same secret used for signing)
3. **Payload Validation**: 
   - Extracts `userId` from `payload.sub` (or `payload.id` for backward compatibility)
   - Validates `phone` and `role` are present
   - Returns `UserPayload` with `id` field (mapped from `sub`)

## Required Actions

### 1. Restart Backend
The backend MUST be restarted to load the new code:

```bash
# Stop the backend (Ctrl+C)
# Then restart:
npm run start:dev
```

### 2. Check Logs
After restart, you should see:
```
JWT Module initialized with secret: f8nUqV6MP0...
JWT Strategy initialized with secret: f8nUqV6MP0...
```

### 3. Log Out and Log Back In
- Old tokens (signed with `id`) will still work (backward compatibility)
- New tokens (signed with `sub`) will work correctly
- For best results, log out and log back in to get a fresh token

### 4. Verify Token Works
After logging in, try accessing:
- `GET /users/me` - should return 200 OK
- `GET /restaurants/me` - should return 200 OK or 200 OK with null body

## Verification

Check backend health endpoint:
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "jwtSecretConfigured": true,
  "jwtSecretPreview": "f8nUqV6MP0..."
}
```

## Debugging

If tokens still fail:

1. **Check JWT_SECRET is set**:
   ```bash
   node check-jwt-secret.js
   ```

2. **Check backend logs** for:
   - JWT Module initialization
   - JWT Strategy initialization
   - Token signing logs (should show `sub` field)
   - Token validation logs (should show `sub` or `id` field)

3. **Decode token on jwt.io**:
   - Use the same `JWT_SECRET` from `.env`
   - Verify payload has `sub` field (not `id`)
   - Verify token is not expired

## Notes

- **Backward Compatibility**: The strategy still accepts tokens with `id` field for backward compatibility
- **Single JWT_SECRET**: Only one `JwtModule.register()` exists in `AuthModule` - no conflicts
- **Bearer Token Extraction**: Using standard `ExtractJwt.fromAuthHeaderAsBearerToken()` - no manual parsing
- **No Supabase JWT Mixing**: All tokens are custom JWT signed with our secret

