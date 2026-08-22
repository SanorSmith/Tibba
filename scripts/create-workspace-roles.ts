import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  // 1. Create table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS workspace_roles (
      roleid uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      workspacetype text NOT NULL,
      name text NOT NULL,
      label text NOT NULL,
      lablear text,
      labelku text,
      description text,
      isactive boolean DEFAULT true NOT NULL,
      createdat timestamp DEFAULT now() NOT NULL,
      updatedat timestamp DEFAULT now() NOT NULL,
      CONSTRAINT workspace_roles_type_name_unique UNIQUE(workspacetype, name)
    )
  `);
  console.log("✓ workspace_roles table created");

  // 2. Seed existing roles
  const roles = [
    // Hospital roles
    { workspacetype: "hospital", name: "doctor", label: "Doctor" },
    { workspacetype: "hospital", name: "nurse", label: "Nurse" },
    { workspacetype: "hospital", name: "receptionist", label: "Receptionist" },
    { workspacetype: "hospital", name: "administrator", label: "Administrator" },
    { workspacetype: "hospital", name: "plastic_surgeon", label: "Plastic Surgeon" },

    // Laboratory roles
    { workspacetype: "laboratory", name: "lab_technician", label: "Lab Technician" },
    { workspacetype: "laboratory", name: "administrator", label: "Administrator" },

    // Pharmacy roles
    { workspacetype: "pharmacy", name: "pharmacist", label: "Pharmacist" },
    { workspacetype: "pharmacy", name: "administrator", label: "Administrator" },
  ];

  for (const role of roles) {
    await sql`
      INSERT INTO workspace_roles (workspacetype, name, label)
      VALUES (${role.workspacetype}, ${role.name}, ${role.label})
      ON CONFLICT (workspacetype, name) DO NOTHING
    `;
  }
  console.log(`✓ Seeded ${roles.length} roles`);

  // 3. Verify
  const result = await sql`SELECT workspacetype, name, label FROM workspace_roles ORDER BY workspacetype, name`;
  console.log("\nRoles in database:");
  for (const r of result) {
    console.log(`  [${r.workspacetype}] ${r.name} → ${r.label}`);
  }

  await sql.end();
}
main();
