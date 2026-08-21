import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  // 1. Add new columns: permissions (jsonb), icon, color
  await sql.unsafe(`
    ALTER TABLE workspace_roles
    ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS icon text,
    ADD COLUMN IF NOT EXISTS color text
  `);
  console.log("✓ Added permissions, icon, color columns");

  // 2. Update existing roles with permissions, icon, color
  const roleData: Record<string, { permissions: string[]; icon: string; color: string }> = {
    "hospital:doctor": {
      permissions: ["View Patients", "Edit Patient Records", "Prescribe Medications", "Order Tests", "View Lab Results", "Create Diagnoses", "Schedule Appointments", "View Medical History"],
      icon: "Stethoscope",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    "hospital:nurse": {
      permissions: ["View Patients", "Update Vital Signs", "Administer Medications", "View Prescriptions", "Update Care Plans", "View Lab Results", "Schedule Appointments"],
      icon: "Heart",
      color: "bg-pink-100 text-pink-800 border-pink-200",
    },
    "hospital:receptionist": {
      permissions: ["Schedule Appointments", "View Patient List", "Check-in Patients", "Manage Billing", "Generate Invoices", "Process Payments"],
      icon: "UserCircle",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    "hospital:administrator": {
      permissions: ["Full System Access", "Manage Users", "Manage Staff", "View All Records", "Edit All Records", "System Configuration", "Generate All Reports", "Manage Departments", "Manage Inventory", "Financial Management"],
      icon: "Shield",
      color: "bg-red-100 text-red-800 border-red-200",
    },
    "hospital:plastic_surgeon": {
      permissions: ["View Patients", "Edit Patient Records", "Prescribe Medications", "Order Tests", "View Lab Results", "Create Diagnoses", "Schedule Appointments", "View Medical History", "Manage Operations"],
      icon: "Stethoscope",
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    "laboratory:lab_technician": {
      permissions: ["View Test Orders", "Update Lab Results", "Manage Lab Equipment", "View Patient Lab History", "Generate Lab Reports"],
      icon: "TestTube",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    "laboratory:administrator": {
      permissions: ["Full System Access", "Manage Users", "Manage Staff", "View All Records", "Edit All Records", "System Configuration", "Generate All Reports", "Manage Inventory"],
      icon: "Shield",
      color: "bg-red-100 text-red-800 border-red-200",
    },
    "pharmacy:pharmacist": {
      permissions: ["View Prescriptions", "Dispense Medications", "Manage Inventory", "Check Drug Interactions", "Update Medication Records", "Generate Pharmacy Reports"],
      icon: "Pill",
      color: "bg-green-100 text-green-800 border-green-200",
    },
    "pharmacy:administrator": {
      permissions: ["Full System Access", "Manage Users", "Manage Staff", "View All Records", "Edit All Records", "System Configuration", "Generate All Reports", "Manage Inventory", "Financial Management"],
      icon: "Shield",
      color: "bg-red-100 text-red-800 border-red-200",
    },
  };

  for (const [key, data] of Object.entries(roleData)) {
    const [workspacetype, name] = key.split(":");
    await sql`
      UPDATE workspace_roles
      SET permissions = ${JSON.stringify(data.permissions)}::jsonb,
          icon = ${data.icon},
          color = ${data.color},
          updatedat = now()
      WHERE workspacetype = ${workspacetype} AND name = ${name}
    `;
  }
  console.log("✓ Updated roles with permissions, icon, color");

  // 3. Verify
  const result = await sql`SELECT workspacetype, name, label, icon, color, permissions FROM workspace_roles ORDER BY workspacetype, name`;
  for (const r of result) {
    const perms = Array.isArray(r.permissions) ? r.permissions.length : 0;
    console.log(`  [${r.workspacetype}] ${r.name} → ${r.label} | icon=${r.icon} | ${perms} permissions`);
  }

  await sql.end();
}
main();
