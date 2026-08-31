
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { pool } from "@/lib/db/pool";


export async function GET(req: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Storage sections belong to a facility's warehouse, so the listing has
    // to say which facility is asking. Without it this returned every
    // pharmacy's sections to everyone.
    const workspaceid = req.nextUrl.searchParams.get("workspaceid");
    if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {

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
        AND w.workspace_id = $2
        AND ws.isactive = true
        AND ($1 = '' OR ws.sectionname ILIKE $1 OR ws.bin_location ILIKE $1)
      ORDER BY ws.sectionname`,
      [`%${search}%`, workspaceid]
    );
    return NextResponse.json(r.rows);
    });
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

    const { name, location, type, temperature, notes, workspaceid } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error:"Name required" }, { status:400 });

    if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {

    // This picked the first pharmacy warehouse in the entire system, so a
    // section could be attached to another facility's warehouse.
    const whResult = await pool.query(
      `SELECT id FROM warehouses
        WHERE warehouse_type = 'pharmacy' AND is_active = true AND workspace_id = $1
        LIMIT 1`,
      [workspaceid]
    );
    
    if (!whResult.rows.length) {
      return NextResponse.json({ error: "No pharmacy warehouse found" }, { status: 404 });
    }
    
    const warehouseId = whResult.rows[0].id;
    
    // Determine if temperature controlled based on temperature value
    const isTemperatureControlled = temperature && temperature.toLowerCase() !== 'room temp' && temperature !== '—';
    
    const r = await pool.query(
      `INSERT INTO warehouse_sections (id, workspace_id, warehouse_id, sectionname, bin_location, section_type, temperature_controlled, temperature, description)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, sectionname as name, bin_location as location, section_type as type, temperature_controlled, temperature, description as notes`,
      [workspaceid, warehouseId, name, location||null, type||"shelf", isTemperatureControlled, temperature||null, notes||null]
    );
    return NextResponse.json(r.rows[0]);
    });
  } catch (error) {
    console.error("Error creating storage location:", error);
    return NextResponse.json({ error: "Failed to create storage location" }, { status: 500 });
  }
}
