# Fix Database Connection Error

## Current Error
```
error: password authentication failed for user "postgres"
```

## Solution

The password authentication is failing. Here are the steps to fix it:

### Option 1: Verify Password in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Copy the **Connection pooling** connection string (port 6543) or **Direct connection** (port 5432)
6. The password in the connection string is the correct one

### Option 2: Reset Database Password

If you need to reset the password:

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Click **Reset database password**
3. Copy the new password
4. Update `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.lreibhelpqsfnefnthtc:NEW_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
   ```

### Option 3: Use Direct Connection (Port 5432)

Sometimes the pooler (port 6543) has issues. Try using direct connection:

1. In Supabase Dashboard → **Settings** → **Database**
2. Copy the **Direct connection** string (uses port 5432)
3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres.lreibhelpqsfnefnthtc:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
   ```

### Option 4: Test Connection Manually

Run the test script to verify:
```bash
node test-db-connection.js
```

This will show you exactly what's wrong with the connection.

## Current Configuration

- **Connection String**: `postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
- **Password**: `Ashashashash333` (verify this is correct in Supabase Dashboard)

## After Fixing

1. Update `.env` with the correct password
2. Restart the server: `npm run start:dev`
3. You should see: `Auth module database connection established`

