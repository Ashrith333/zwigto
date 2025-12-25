require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

// Also try direct connection if pooler fails
const directConnectionString = 'postgresql://postgres:Ashashashash333@db.lreibhelpqsfnefnthtc.supabase.co:5432/postgres';

console.log('Testing database connection...');
console.log('Connection string (masked):', connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query('SELECT NOW()')
  .then((result) => {
    console.log('✅ Connection successful!');
    console.log('Server time:', result.rows[0].now);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Password authentication failed. Possible issues:');
      console.error('   1. Password in DATABASE_URL might be incorrect');
      console.error('   2. Password might need URL encoding');
      console.error('   3. Database user might not exist or have wrong permissions');
      console.error('\nCurrent password in connection string:', 
        connectionString.match(/postgres\.([^:]+):([^@]+)@/)?.[2] || 'NOT FOUND');
    }
    process.exit(1);
  });

