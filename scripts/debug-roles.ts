import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  // Check raw value
  const result = await sql`SELECT name, permissions, pg_typeof(permissions) as typ FROM workspace_roles LIMIT 3`;
  console.log("Raw result:", JSON.stringify(result, null, 2));

  // Fix: set as proper jsonb array
  const perms = JSON.stringify(["View Patients", "Edit Records"]);
  await sql`UPDATE workspace_roles SET permissions = ${sql.json(["View Patients", "Edit Records"])} WHERE name = 'doctor' AND workspacetype = 'hospital'`;
  
  const check = await sql`SELECT name, permissions FROM workspace_roles WHERE name = 'doctor' AND workspacetype = 'hospital'`;
  console.log("After fix:", JSON.stringify(check, null, 2));

  await sql.end();
}
main();
