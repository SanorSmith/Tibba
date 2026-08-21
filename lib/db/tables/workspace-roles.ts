/**
 * Workspace Roles Table (Drizzle ORM)
 *
 * Roles are scoped per workspace type (hospital, laboratory, pharmacy).
 * Each workspace type has its own set of valid roles.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

export const workspaceRoles = pgTable(
  "workspace_roles",
  {
    roleid: uuid("roleid").primaryKey().defaultRandom(),
    workspacetype: text("workspacetype").notNull(), // hospital | laboratory | pharmacy
    name: text("name").notNull(), // internal key e.g. "doctor", "pharmacist"
    label: text("label").notNull(), // display name e.g. "Doctor", "Pharmacist"
    lablear: text("lablear"), // Arabic label
    labelku: text("labelku"), // Kurdish label
    description: text("description"),
    permissions: jsonb("permissions").default([]).$type<string[]>(),
    icon: text("icon"), // Lucide icon name e.g. "Stethoscope", "Pill"
    color: text("color"), // Tailwind CSS classes e.g. "bg-blue-100 text-blue-800"
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat").defaultNow().notNull(),
    updatedat: timestamp("updatedat").defaultNow().notNull(),
  },
  (table) => ({
    uniqueRolePerType: unique("workspace_roles_type_name_unique").on(
      table.workspacetype,
      table.name
    ),
  })
);

export type WorkspaceRole = typeof workspaceRoles.$inferSelect;
export type NewWorkspaceRole = typeof workspaceRoles.$inferInsert;
