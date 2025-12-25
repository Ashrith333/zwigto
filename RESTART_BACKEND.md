# How to Restart Backend

## The Problem
If you're getting "Invalid or expired token" errors, the backend likely needs to be restarted to load the JWT_SECRET from `.env`.

## Steps to Restart

1. **Find the backend terminal** - Look for the terminal running `npm run start:dev` or `nest start --watch`

2. **Stop the backend**:
   - Press `Ctrl+C` in that terminal
   - Wait for it to stop completely

3. **Start it again**:
   ```bash
   npm run start:dev
   ```

4. **Check the logs** - You should see:
   ```
   JWT Module initialized with secret: f8nUqV6MP0...
   JWT Strategy initialized with secret: f8nUqV6MP0...
   Application is running on: http://localhost:3000
   ```

5. **Verify JWT_SECRET is loaded**:
   ```bash
   curl http://localhost:3000/health
   ```
   
   Should show:
   ```json
   {
     "jwtSecretConfigured": true,
     "jwtSecretPreview": "f8nUqV6MP0..."
   }
   ```

## If JWT_SECRET is NOT SET
- Check your `.env` file has `JWT_SECRET=f8nUqV6MP0x4cD0lx2td5D2pwSdTpASQYhXlMxRF3UJqod+iXA3NgqRknlubDmYFJ/1s1XZIQxC6McWEw5mRBQ==`
- Make sure there are no spaces around the `=` sign
- Restart the backend after updating `.env`
