/**
 * Provision pharmacy schemas for all existing pharmacy-type workspaces.
 * Run this once to set up the tenant schemas.
 */
import "dotenv/config";
import postgres from "postgres";
import { provisionPharmacySchema, getPharmacySchemaName } from "../lib/db/pharmacy-tenant";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = postgres(
    dbUrl.includes("sslmode=") ? dbUrl : `${dbUrl}?sslmode=require`
  );

  try {
    // Find all pharmacy-type workspaces
    const pharmacyWorkspaces = await sql`
      SELECT workspaceid, name FROM workspaces WHERE type = 'pharmacy'
    `;

    console.log(`Found ${pharmacyWorkspaces.length} pharmacy workspace(s):\n`);

    for (const ws of pharmacyWorkspaces) {
      const schemaName = getPharmacySchemaName(ws.workspaceid);
      console.log(`  Provisioning: "${ws.name}" → schema "${schemaName}" ...`);
      await provisionPharmacySchema(sql, ws.workspaceid);
      console.log(`  ✓ Done\n`);
    }

    console.log("All pharmacy schemas provisioned successfully.");
  } catch (error) {
    console.error("Error provisioning schemas:", error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
