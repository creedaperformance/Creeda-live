import pkg from 'pg';
import { getDatabaseUrlWithLocalFallback } from '../env.mjs';
const { Client } = pkg;
const dbUrl = getDatabaseUrlWithLocalFallback();

const client = new Client({ connectionString: dbUrl });

async function fix() {
  await client.connect();
  console.log('Connected to DB');
  try {
    const res = await client.query('ALTER TABLE daily_load_logs ADD COLUMN IF NOT EXISTS fatigue integer CHECK (fatigue BETWEEN 1 AND 5);');
    console.log('Added fatigue column:', res);
    const res2 = await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Reloaded schema cache:', res2);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
fix();
