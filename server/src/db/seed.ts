import { pool, testConnection, closePool } from './connection.js';
import { hashPassword } from '../services/auth.service.js';

async function seed() {
  console.log('Seeding database...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }
  
  try {
    // Check if admin user exists
    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@inventory.local'"
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists, skipping...');
      await closePool();
      return;
    }
    
    // Create admin user with default password
    // DEFAULT PASSWORD: Admin123! (CHANGE IMMEDIATELY IN PRODUCTION)
    const passwordHash = await hashPassword('Admin123!');
    
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin@inventory.local', passwordHash, 'System', 'Administrator', 'admin', true]
    );
    
    console.log('✓ Admin user created successfully');
    console.log('\n  Email: admin@inventory.local');
    console.log('  Password: Admin123!');
    console.log('\n  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n');
    
    // Create a demo analyst user
    const analystHash = await hashPassword('Analyst123!');
    
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['analyst@inventory.local', analystHash, 'Demo', 'Analyst', 'analyst', true]
    );
    
    console.log('✓ Demo analyst user created');
    console.log('\n  Email: analyst@inventory.local');
    console.log('  Password: Analyst123!\n');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();

