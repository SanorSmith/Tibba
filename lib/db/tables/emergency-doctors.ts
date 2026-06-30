/**
 * Emergency doctor tables (Drizzle ORM)
 * - emergency_doctor_availability: tracks which doctors are available for emergency assignments.
 * - emergency_doctor_assignments: tracks which doctor is assigned to a given triage visit.
 */
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import { patients } from "./patient";

export const emergencyDoctorAvailability = pgTable("emergency_doctor_availability", {
  availabilityid: uuid("availabilityid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  doctorid: uuid("doctorid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  isavailable: boolean("isavailable").notNull().default(true),
  shiftstart: timestamp("shiftstart", { withTimezone: true }),
  shiftend: timestamp("shiftend", { withTimezone: true }),
  createdat: timestamp("createdat", { withTimezone: true }).defaultNow().notNull(),
  updatedat: timestamp("updatedat", { withTimezone: true }).defaultNow().notNull(),
});

export const emergencyDoctorAssignments = pgTable("emergency_doctor_assignments", {
  assignmentid: uuid("assignmentid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  visitid: text("visitid").notNull().unique(),
  patientid: uuid("patientid")
    .notNull()
    .references(() => patients.patientid, { onDelete: "cascade" }),
  doctorid: uuid("doctorid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  assignedat: timestamp("assignedat", { withTimezone: true }).defaultNow().notNull(),
  assignedby: uuid("assignedby").references(() => users.userid, { onDelete: "set null" }),
});

export type EmergencyDoctorAvailability = typeof emergencyDoctorAvailability.$inferSelect;
export type NewEmergencyDoctorAvailability = typeof emergencyDoctorAvailability.$inferInsert;
export type EmergencyDoctorAssignment = typeof emergencyDoctorAssignments.$inferSelect;
export type NewEmergencyDoctorAssignment = typeof emergencyDoctorAssignments.$inferInsert;
