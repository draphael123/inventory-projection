import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection, closePool } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log('Running database migrations...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }
  
  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✓ Database schema created successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('Tables already exist, skipping...');
    } else {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  } finally {
    await closePool();
  }
}

migrate();

