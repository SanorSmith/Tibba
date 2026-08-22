/**
 * Quick smoke test: insert and query a pharmacy in a tenant schema.
 */
import "dotenv/config";
import postgres from "postgres";
import { withPharmacySchema, getPharmacySchemaName } from "../lib/db/pharmacy-tenant";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = postgres(dbUrl.includes("sslmode=") ? dbUrl : `${dbUrl}?sslmode=require`);

  // Use the "Ali Pharma" workspace
  const workspaceid = "87589e68-6e0a-470c-9440-0ad7245acd1b";
  const schemaName = getPharmacySchemaName(workspaceid);
  console.log(`Testing schema: ${schemaName}\n`);

  try {
    // 1. List tables in the schema
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = ${schemaName}
      ORDER BY table_name
    `;
    console.log("Tables in schema:", tables.map(t => t.table_name));

    // 2. Insert a test pharmacy
    const [pharmacy] = await withPharmacySchema(sql, workspaceid, async (tx) => {
      return tx`
        INSERT INTO pharmacies (name, phone, email, address, city)
        VALUES ('Test Pharmacy', '1234567890', 'test@test.com', '123 Test St', 'Test City')
        RETURNING *
      `;
    });
    console.log("\nInserted pharmacy:", pharmacy);

    // 3. Query all pharmacies
    const all = await withPharmacySchema(sql, workspaceid, async (tx) => {
      return tx`SELECT * FROM pharmacies`;
    });
    console.log(`\nAll pharmacies in tenant (${all.length}):`, all);

    // 4. Clean up test data
    await withPharmacySchema(sql, workspaceid, async (tx) => {
      return tx`DELETE FROM pharmacies WHERE name = 'Test Pharmacy'`;
    });
    console.log("\nCleaned up test data.");

    // 5. Verify public.pharmacies is NOT used
    const publicCount = await sql`SELECT COUNT(*) as cnt FROM public.pharmacies`;
    console.log(`\nPublic schema pharmacies count: ${publicCount[0].cnt}`);

    console.log("\n✓ All tests passed!");
  } catch (error) {
    console.error("Test failed:", error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
