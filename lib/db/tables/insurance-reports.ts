import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { patients } from "./patient";

export const insuranceReports = pgTable("insurance_reports", {
  reportid: uuid("reportid").primaryKey().defaultRandom(),
  patientid: uuid("patientid")
    .notNull()
    .references(() => patients.patientid, { onDelete: "cascade" }),
  reporttype: text("reporttype").notNull(),
  insurancecompany: text("insurancecompany").notNull(),
  diagnosis: text("diagnosis").notNull(),
  clinicalfindings: text("clinicalfindings"),
  treatmentplan: text("treatmentplan"),
  medications: text("medications"),
  investigations: text("investigations"),
  prognosis: text("prognosis"),
  workstatus: text("workstatus"),
  recommendations: text("recommendations"),
  reportdata: jsonb("reportdata"), // Store full report as JSON
  createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
});

export type InsuranceReport = typeof insuranceReports.$inferSelect;
export type NewInsuranceReport = typeof insuranceReports.$inferInsert;
