import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const r = await pool.query(
    `SELECT s.*, d.name AS department_name FROM hospital_storage_locations s
     LEFT JOIN departments d ON d.departmentid = s.department_id
     WHERE s.workspace_id=$1 AND s.isactive=true
     AND ($2='' OR s.name ILIKE $2 OR s.location ILIKE $2) ORDER BY s.name`,
    [WS, `%${search}%`]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { name, department_id, location, type, temperature, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const r = await pool.query(
    `INSERT INTO hospital_storage_locations (id,workspace_id,department_id,name,location,type,temperature,notes,isactive,createdat,updatedat)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) RETURNING *`,
    [WS, department_id||null, name, location||null, type||"shelf", temperature||null, notes||null]
  );
  return NextResponse.json(r.rows[0]);
}

export async function PATCH(req: NextRequest) {
  const { id, name, department_id, location, type, temperature, notes } = await req.json();
  await pool.query(
    `UPDATE hospital_storage_locations SET name=$1,department_id=$2,location=$3,type=$4,temperature=$5,notes=$6,updatedat=NOW() WHERE id=$7`,
    [name, department_id||null, location||null, type||"shelf", temperature||null, notes||null, id]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await pool.query(`UPDATE hospital_storage_locations SET isactive=false WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}
