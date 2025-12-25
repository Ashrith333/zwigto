// Quick script to verify JWT_SECRET is loaded
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const jwtExpires = process.env.JWT_EXPIRES_IN;

console.log('=== JWT Configuration Check ===');
console.log('JWT_SECRET:', jwtSecret ? `${jwtSecret.substring(0, 20)}...` : 'NOT SET ❌');
console.log('JWT_SECRET length:', jwtSecret ? jwtSecret.length : 0);
console.log('JWT_EXPIRES_IN:', jwtExpires || '24h (default)');

if (!jwtSecret || jwtSecret === 'default-secret-change-in-production') {
  console.log('\n⚠️  WARNING: JWT_SECRET is not set or using default value!');
  console.log('Please set JWT_SECRET in your .env file.');
} else {
  console.log('\n✅ JWT_SECRET is configured');
}

