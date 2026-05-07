import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
const CENTRAL = '00000000-0000-0000-0000-000000000000';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const dateFrom = req.nextUrl.searchParams.get("dateFrom") ?? "";
  const dateTo = req.nextUrl.searchParams.get("dateTo") ?? "";
  try {
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE`).catch(()=>{});
    const r = await pool.query(
      `SELECT gr.*,
        (SELECT COUNT(*) FROM hospital_goods_receipt_items gri WHERE gri.receipt_id=gr.id)::int AS item_count
       FROM hospital_goods_receipt gr
       WHERE gr.workspace_id=$1
         AND gr.status IN ('COMPLETE','PARTIAL')
         AND (COALESCE(gr.is_reversal,false)=false)
         AND ($2='' OR
              LOWER(gr.receipt_number) LIKE $2 OR
              LOWER(COALESCE(gr.order_number,'')) LIKE $2 OR
              LOWER(COALESCE(gr.supplier_name,'')) LIKE $2 OR
              EXISTS(
                SELECT 1 FROM hospital_goods_receipt_items gri2
                WHERE gri2.receipt_id=gr.id AND LOWER(COALESCE(gri2.item_name,'')) LIKE $2
              ))
         AND ($3='' OR gr.receipt_date::date >= $3::date)
         AND ($4='' OR gr.receipt_date::date <= $4::date)
       ORDER BY gr.createdat DESC
       LIMIT 50`,
      [WS, q ? `%${q}%` : '', dateFrom, dateTo]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error("GET correction search error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const { originalReceiptId, correctedBy, reason, items } = b;

    if (!originalReceiptId) return NextResponse.json({ error: "Original receipt required" }, { status: 400 });
    if (!correctedBy?.trim()) return NextResponse.json({ error: "Corrected by is required" }, { status: 400 });
    if (!reason?.trim()) return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    if (!items?.length) return NextResponse.json({ error: "No items provided" }, { status: 400 });

    // Ensure correction columns exist
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS correction_of UUID`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS correction_reason TEXT`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS corrected_by TEXT`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS correction_type VARCHAR(20)`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt_items ADD COLUMN IF NOT EXISTS dn_reg_num VARCHAR(100)`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt_items ADD COLUMN IF NOT EXISTS delivered_total INTEGER`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt_items ADD COLUMN IF NOT EXISTS return_claim INTEGER`).catch(()=>{});

    // Fetch the original receipt
    const orig = await pool.query(`SELECT * FROM hospital_goods_receipt WHERE id=$1`, [originalReceiptId]);
    if (!orig.rows[0]) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    const origReceipt = orig.rows[0];

    const now = Date.now();

    // 1. Create reversal GR record (negative quantities)
    const revNum = `GR-REV-${now.toString().slice(-8)}`;
    const revR = await pool.query(
      `INSERT INTO hospital_goods_receipt
         (id,workspace_id,receipt_number,order_id,order_number,received_by,
          receipt_date,supplier_name,supplier_email,status,notes,
          is_reversal,correction_of,correction_reason,corrected_by,correction_type,
          createdat,updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,NOW(),$6,$7,'CORRECTION',$8,
               TRUE,$9,$10,$11,'REVERSAL',NOW(),NOW())
       RETURNING id,receipt_number`,
      [WS, revNum, origReceipt.order_id, origReceipt.order_number, correctedBy,
       origReceipt.supplier_name, origReceipt.supplier_email,
       `[Reversal] ${reason}`, originalReceiptId, reason, correctedBy]
    );
    const revId = revR.rows[0].id;
    const revReceiptNum = revR.rows[0].receipt_number;

    // 2. Create corrected GR record (positive quantities)
    const corrNum = `GR-COR-${(now+1).toString().slice(-8)}`;
    const corrR = await pool.query(
      `INSERT INTO hospital_goods_receipt
         (id,workspace_id,receipt_number,order_id,order_number,received_by,
          receipt_date,supplier_name,supplier_email,status,notes,
          is_reversal,correction_of,correction_reason,corrected_by,correction_type,
          createdat,updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,NOW(),$6,$7,'CORRECTION',$8,
               FALSE,$9,$10,$11,'CORRECTED',NOW(),NOW())
       RETURNING id,receipt_number`,
      [WS, corrNum, origReceipt.order_id, origReceipt.order_number, correctedBy,
       origReceipt.supplier_name, origReceipt.supplier_email,
       `[Correction] ${reason}`, originalReceiptId, reason, correctedBy]
    );
    const corrId = corrR.rows[0].id;
    const corrReceiptNum = corrR.rows[0].receipt_number;

    // 3. Process each item
    for (const item of items) {
      const origQty = parseInt(item.originalQty) || 0;
      const corrQty = parseInt(item.correctedQty) || 0;
      const diff = corrQty - origQty; // net change (can be negative)

      // Insert reversal item (negative of original)
      await pool.query(
        `INSERT INTO hospital_goods_receipt_items
           (id,receipt_id,item_id,item_name,uom,ordered_qty,received_qty,notes,createdat)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW())`,
        [revId, item.itemId||null, item.itemName||null, item.uom||null,
         origQty, -origQty, `Reversal of original receipt`]
      );

      // Insert corrected item
      await pool.query(
        `INSERT INTO hospital_goods_receipt_items
           (id,receipt_id,item_id,item_name,uom,ordered_qty,received_qty,notes,createdat)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW())`,
        [corrId, item.itemId||null, item.itemName||null, item.uom||null,
         origQty, corrQty, item.itemNote||null]
      );

      // Update stock (allow negative — net diff only)
      if (item.itemId && diff !== 0) {
        await pool.query(
          `INSERT INTO hospital_stock (id,item_id,department_id,quantity,reserved_quantity,last_updated)
           VALUES (gen_random_uuid(),$1,$2,$3,0,NOW())
           ON CONFLICT (item_id,department_id)
           DO UPDATE SET quantity=hospital_stock.quantity+$3, last_updated=NOW()`,
          [item.itemId, CENTRAL, diff]
        );

        // Log reversal history
        await pool.query(
          `INSERT INTO hospital_history
             (id,workspace_id,item_id,item_name,department_id,action_type,quantity,reference_id,created_by,createdat)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'CORRECTION_REVERSAL',$5,$6,$7,NOW())`,
          [WS, item.itemId, item.itemName, CENTRAL, -origQty, revReceiptNum, correctedBy]
        );
        // Log correction history
        await pool.query(
          `INSERT INTO hospital_history
             (id,workspace_id,item_id,item_name,department_id,action_type,quantity,reference_id,created_by,createdat)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'CORRECTION_IN',$5,$6,$7,NOW())`,
          [WS, item.itemId, item.itemName, CENTRAL, corrQty, corrReceiptNum, correctedBy]
        );
      }
    }

    return NextResponse.json({ success: true, reversalNumber: revReceiptNum, correctionNumber: corrReceiptNum });
  } catch (e: any) {
    console.error("POST correction error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
