import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  const labTables = [
    "labs", "laborders", "labtests", "labreviews",
    "lab_test_catalog", "lims_orders", "lims_order_tests",
    "laboratory_types", "test_reference_ranges", "test_results",
    "test_packages", "test_package_items", "test_reference_audit_log",
    "lab_shifts", "lab_payments", "lab_claims", "lab_claim_damage",
    "lab_consumption_log", "lab_purchase_orders", "lab_purchase_order_items",
    "lab_goods_receipt", "lab_goods_receipt_items",
    "lab_vendor_returns", "lab_vendor_return_items",
  ];

  for (const table of labTables) {
    const ddl = await sql`
      SELECT 
        'CREATE TABLE IF NOT EXISTS "' || ${table} || '" (' ||
        string_agg(
          '"' || column_name || '" ' || 
          CASE 
            WHEN data_type = 'uuid' THEN 'UUID'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'numeric' THEN 'NUMERIC(' || COALESCE(numeric_precision::text, '') || ',' || COALESCE(numeric_scale::text, '') || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            WHEN data_type = 'ARRAY' THEN 'TEXT[]'
            ELSE UPPER(data_type)
          END ||
          CASE WHEN column_default LIKE 'gen_random_uuid()' THEN ' DEFAULT gen_random_uuid()' 
               WHEN column_default LIKE 'now()' THEN ' DEFAULT now()'
               WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
               ELSE '' END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
          ', ' ORDER BY ordinal_position
        ) || ');' as ddl
      FROM information_schema.columns
      WHERE table_name = ${table} AND table_schema = 'public'
      GROUP BY table_name
    `;
    if (ddl.length > 0) {
      console.log(`\n-- ${table}`);
      console.log(ddl[0].ddl);
    } else {
      console.log(`\n-- ${table} (NOT FOUND)`);
    }
  }

  // Also get primary keys
  console.log("\n\n-- PRIMARY KEYS:");
  const pks = await sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (${sql(labTables)})
    ORDER BY tc.table_name
  `;
  for (const pk of pks) {
    console.log(`  ${pk.table_name} → ${pk.column_name}`);
  }

  await sql.end();
}
main();
