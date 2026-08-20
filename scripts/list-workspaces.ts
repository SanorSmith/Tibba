import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");
  const workspaces = await sql`SELECT workspaceid, name, type FROM workspaces ORDER BY name`;
  console.table(workspaces);

  const pharmacies = await sql`SELECT pharmacyid, name, workspaceid FROM pharmacies ORDER BY name`;
  console.table(pharmacies);

  await sql.end();
}

main();
