import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const connectionUrl = process.env.DATABASE_URL || 'mysql://root@localhost:3306/whatsapp_baileys';
  console.log(`Connecting to MySQL database: ${connectionUrl}...`);

  const conn = await mysql.createConnection(connectionUrl);
  console.log('Connected successfully!');

  const sqlFilePath = path.join(process.cwd(), 'drizzle', '0000_pink_mordo.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
      console.log(`[${i + 1}/${statements.length}] Executed statement`);
    } catch (err: any) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`[${i + 1}/${statements.length}] Table already exists, skipping.`);
      } else {
        console.error(`[${i + 1}/${statements.length}] Error:`, err.message);
      }
    }
  }

  const [tables]: any = await conn.query('SHOW TABLES');
  console.log('\n✅ Migration complete! Tables in database:');
  console.log(tables.map((t: any) => Object.values(t)[0]));

  await conn.end();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
