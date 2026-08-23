import { Pool } from "pg";

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get("search") ?? "";
    const r = await pool.query(
      `SELECT 
        ws.id,
        ws.sectionname as name,
        ws.bin_location as location,
        ws.section_type as type,
        ws.temperature_controlled,
        COALESCE(ws.temperature, '—') as temperature,
        ws.description as notes,
        w.name as warehouse_name
      FROM warehouse_sections ws
      JOIN warehouses w ON w.id = ws.warehouse_id
      WHERE w.warehouse_type = 'pharmacy'
        AND ws.isactive = true
        AND ($1 = '' OR ws.sectionname ILIKE $1 OR ws.bin_location ILIKE $1)
      ORDER BY ws.sectionname`,
      [`%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (error) {
    console.error("Error fetching storage:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, location, type, temperature, notes } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error:"Name required" }, { status:400 });
    
    // Get pharmacy warehouse ID
    const whResult = await pool.query(
      `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true LIMIT 1`
    );
    
    if (!whResult.rows.length) {
      return NextResponse.json({ error: "No pharmacy warehouse found" }, { status: 404 });
    }
    
    const warehouseId = whResult.rows[0].id;
    
    // Determine if temperature controlled based on temperature value
    const isTemperatureControlled = temperature && temperature.toLowerCase() !== 'room temp' && temperature !== '—';
    
    const r = await pool.query(
      `INSERT INTO warehouse_sections (id, warehouse_id, sectionname, bin_location, section_type, temperature_controlled, temperature, description)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, sectionname as name, bin_location as location, section_type as type, temperature_controlled, temperature, description as notes`,
      [warehouseId, name, location||null, type||"shelf", isTemperatureControlled, temperature||null, notes||null]
    );
    return NextResponse.json(r.rows[0]);
  } catch (error) {
    console.error("Error creating storage location:", error);
    return NextResponse.json({ error: "Failed to create storage location" }, { status: 500 });
  }
}
