import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  const tables = [
    "labs", "laborders", "labtests", "labreviews",
    "lab_test_catalog", "lims_orders", "lims_order_tests",
    "laboratory_types", "test_reference_ranges", "test_results",
  ];

  for (const t of tables) {
    const r = await sql.unsafe(
      `SELECT column_name, data_type, column_default, is_nullable
       FROM information_schema.columns
       WHERE table_name=$1 AND table_schema='public'
       ORDER BY ordinal_position`, [t]
    );
    if (r.length === 0) {
      console.log(`${t}: (NOT FOUND)`);
    } else {
      console.log(`\n${t}:`);
      for (const c of r) {
        console.log(`  ${c.column_name} | ${c.data_type} | nullable=${c.is_nullable} | default=${c.column_default || 'none'}`);
      }
    }
  }

  await sql.end();
}
main();
