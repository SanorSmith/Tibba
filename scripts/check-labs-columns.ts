import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  // List all LIMS/lab-related tables
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND (table_name LIKE '%lab%' OR table_name LIKE '%lims%' OR table_name LIKE '%test%')
    ORDER BY table_name
  `;
  console.log("LIMS/Lab tables:", tables.map(t => t.table_name));

  // Labs columns
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'labs' AND table_schema = 'public' ORDER BY ordinal_position`;
  console.log("\nLabs columns:", cols.map(c => c.column_name));

  // LIMS workspaces
  const ws = await sql`SELECT workspaceid, name, type FROM workspaces WHERE type = 'lab' OR type = 'lims' OR type = 'laboratory'`;
  console.log("\nLIMS workspaces:", ws);

  await sql.end();
}
main();
