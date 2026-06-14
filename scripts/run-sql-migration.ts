/**
 * Run a standalone SQL migration file against the database.
 * Usage: npx tsx scripts/run-sql-migration.ts <path-to-sql-file>
 */
import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Usage: npx tsx scripts/run-sql-migration.ts <path-to-sql-file>");
    process.exit(1);
  }

  const filePath = resolve(sqlFile);
  const sqlContent = readFileSync(filePath, "utf-8");

  console.log(`Connecting to database...`);
  const client = postgres(`${url}?sslmode=require`, { max: 1 });

  console.log(`Running migration: ${filePath}`);
  await client.unsafe(sqlContent);

  console.log("✅ Migration applied successfully!");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
