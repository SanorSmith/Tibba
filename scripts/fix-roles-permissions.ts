import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL + "?sslmode=require");

  const roleData: Record<string, string[]> = {
    "hospital:doctor": ["View Patients", "Edit Patient Records", "Prescribe Medications", "Order Tests", "View Lab Results", "Create Diagnoses", "Schedule Appointments", "View Medical History"],
    "hospital:nurse": ["View Patients", "Update Vital Signs", "Administer Medications", "View Prescriptions", "Update Care Plans", "View Lab Results", "Schedule Appointments"],
    "hospital:receptionist": ["Schedule Appointments", "View Patient List", "Check-in Patients", "Manage Billing", "Generate Invoices", "Process Payments"],
    "hospital:administrator": ["Full System Access", "Manage Users", "Manage Staff", "View All Records", "Edit All Records", "System Configuration", "Generate All Reports", "Manage Departments", "Manage Inventory", "Financial Management"],
    "hospital:plastic_surgeon": ["View Patients", "Edit Patient Records", "Prescribe Medications", "Order Tests", "View Lab Results", "Create Diagnoses", "Schedule Appointments", "View Medical History", "Manage Operations"],
    "laboratory:lab_technician": ["View Test Orders", "Update Lab Results", "Manage Lab Equipment", "View Patient Lab History", "Generate Lab Reports"],
    "laboratory:administrator": ["Full System Access", "Manage Users", "Manage Staff", "View All Records", "Edit All Records", "System Configuration", "Generate All Reports", "Manage Inventory"],
    "pharmacy:pharmacist": ["View Prescriptions", "Dispense Medications", "Manage Inventory", "Check Drug Interactions", "Update Medication Records", "Generate Pharmacy Reports"],
    "pharmacy:administrator": ["Full System Access", "Manage Users", "Manage Staff", "View All Records", "Edit All Records", "System Configuration", "Generate All Reports", "Manage Inventory", "Financial Management"],
  };

  for (const [key, perms] of Object.entries(roleData)) {
    const [workspacetype, name] = key.split(":");
    await sql`
      UPDATE workspace_roles
      SET permissions = ${sql.json(perms)}
      WHERE workspacetype = ${workspacetype} AND name = ${name}
    `;
  }
  console.log("✓ Updated permissions");

  const result = await sql`SELECT workspacetype, name, permissions FROM workspace_roles ORDER BY workspacetype, name`;
  for (const r of result) {
    const perms = Array.isArray(r.permissions) ? r.permissions.length : 0;
    console.log(`  [${r.workspacetype}] ${r.name} → ${perms} permissions`);
  }

  await sql.end();
}
main();
