const { pool } = require('./index');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log(' Running database migrations...');

  const client = await pool.connect();

  try {
    // Create a table that tracks which migrations have run
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migrations already executed
    const { rows: executed } = await client.query(
      'SELECT filename FROM migrations ORDER BY filename'
    );
    const executedFiles = new Set(executed.map(r => r.filename));

    // Read all SQL files from the migrations folder
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`  ⏭  Skipping ${file} (already ran)`);
        continue;
      }

      console.log(`   Running ${file}...`);

      const sql = fs.readFileSync(
        path.join(migrationsDir, file), 'utf8'
      );

      // BEGIN: start a transaction
      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)', [file]
        );
        // COMMIT: save all changes permanently
        await client.query('COMMIT');
        console.log(`   ${file} done`);

      } catch (error) {
        // ROLLBACK: undo everything if something failed
        await client.query('ROLLBACK');
        console.error(`   ${file} failed:`, error.message);
        throw error;
      }
    }

    console.log(' All migrations complete');

  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});