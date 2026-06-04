import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import pool from './db';

const migrate = async (): Promise<void> => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/init.sql'),
    'utf-8'
  );
  await pool.query(sql);
  console.log('Migration completed successfully');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
