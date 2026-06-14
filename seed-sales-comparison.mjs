import "dotenv/config";
import postgres from "postgres";

const sql = postgres(`${process.env.DATABASE_URL}?sslmode=require`);

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function main() {
  // Verify workspace exists
  const ws = await sql`SELECT workspaceid, name FROM workspaces WHERE workspaceid = ${WORKSPACE_ID}`;
  if (ws.length === 0) {
    console.error("Workspace not found:", WORKSPACE_ID);
    process.exit(1);
  }
  console.log("Workspace:", ws[0].name);

  // Find a cashier (any user in this workspace)
  const cashier = await sql`
    SELECT u.userid, u.email FROM workspaceusers wu
    JOIN users u ON u.userid = wu.userid
    WHERE wu.workspaceid = ${WORKSPACE_ID}
    LIMIT 1
  `;
  if (cashier.length === 0) {
    console.error("No users found for workspace");
    process.exit(1);
  }
  const cashierid = cashier[0].userid;
  console.log("Using cashier:", cashier[0].email);

  // Date helpers - Baghdad local "today" at noon UTC for stable timestamps
  const now = new Date();
  const makeDate = (yearsAgo) => {
    const d = new Date(Date.UTC(now.getUTCFullYear() - yearsAgo, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    return d;
  };

  const rows = [
    { yearsAgo: 0, total: "540.00" },
    { yearsAgo: 1, total: "380.50" },
    { yearsAgo: 2, total: "295.75" },
  ];

  for (const row of rows) {
    const saleDate = makeDate(row.yearsAgo);
    const salenumber = `SEED-COMPARE-${row.yearsAgo}Y-${Date.now()}`;
    await sql`
      INSERT INTO pos_sales (
        workspaceid, salenumber, saledate, saletype,
        subtotal, taxamount, discountamount, totalamount, paidamount, changeamount,
        status, cashierid, createdat, updatedat
      ) VALUES (
        ${WORKSPACE_ID}, ${salenumber}, ${saleDate}, 'OTC_WALKIN',
        ${row.total}, 0, 0, ${row.total}, ${row.total}, 0,
        'COMPLETED', ${cashierid}, ${saleDate}, ${saleDate}
      )
    `;
    console.log(`Inserted seed sale for ${row.yearsAgo} year(s) ago: $${row.total} on ${saleDate.toISOString()}`);
  }

  await sql.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
