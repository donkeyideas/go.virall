#!/usr/bin/env node
/**
 * Go Virall v2 — Migration Runner
 *
 * Usage:
 *   node scripts/run-migration.js "postgresql://postgres:[PASSWORD]@db.qrtbfhhhilcoeovdubqb.supabase.co:5432/postgres"
 *
 * Or set DATABASE_URL environment variable:
 *   DATABASE_URL="postgresql://..." node scripts/run-migration.js
 *
 * The database password can be found in:
 *   Supabase Dashboard → Project Settings → Database → Connection string
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const dbUrl = process.argv[2] || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("Usage: node scripts/run-migration.js <DATABASE_URL>");
    console.error("  Or set DATABASE_URL environment variable");
    console.error("");
    console.error("Find your database URL in:");
    console.error("  Supabase Dashboard → Project Settings → Database → Connection string");
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "000_wipe_and_rebuild.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected! Running migration...");
    await client.query(sql);
    console.log("Migration completed successfully!");
    console.log("Your Go Virall v2 database is ready.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
