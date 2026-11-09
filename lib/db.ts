import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@/db/schema';

// Configure MySQL pool with UTC timezone to ensure all timestamps (dates/times)
// match exact real-world UTC timestamps without local timezone skew.
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  timezone: 'Z',
});

// Enforce UTC session timezone on every MySQL connection in the pool
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

export const db = drizzle(pool, { schema, mode: 'default' });

