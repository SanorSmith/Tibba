import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  const enums = await sql`
    SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname LIKE 'lab_%'
    GROUP BY t.typname
    ORDER BY t.typname
  `;
  console.log("Lab enums:");
  for (const e of enums) {
    console.log(`  ${e.typname}: ${e.labels}`);
  }

  // Also check labtests PK (composite?)
  const pks = await sql`
    SELECT tc.table_name, string_agg(kcu.column_name, ', ') as pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('labs','laborders','labtests','labreviews','lab_test_catalog','lims_orders','lims_order_tests','laboratory_types','test_reference_ranges','test_results','test_packages','test_package_items','test_reference_audit_log','lab_shifts','lab_payments','lab_claims','lab_claim_damage','lab_consumption_log','lab_purchase_orders','lab_purchase_order_items','lab_goods_receipt','lab_goods_receipt_items','lab_vendor_returns','lab_vendor_return_items','study_protocols')
    GROUP BY tc.table_name
    ORDER BY tc.table_name
  `;
  console.log("\nPrimary keys:");
  for (const pk of pks) {
    console.log(`  ${pk.table_name}: ${pk.pk_cols}`);
  }

  await sql.end();
}
main();
