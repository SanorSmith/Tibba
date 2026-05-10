/**
 * Insurance & Patient Insurance tables (Drizzle ORM)
 *
 * - insurance_companies: master list of insurance providers
 * - patient_insurance: links patients to their insurance plans
 * - insurance_pre_approvals: tracks prior authorization requests
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  index,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { patients } from "./patient";

// ── Insurance companies ───────────────────────────────────────────────
export const insuranceCompanies = pgTable(
  "insurance_companies",
  {
    insuranceid: uuid("insuranceid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid"),
    name: text("name").notNull(),
    code: text("code"), // short code e.g. "BCBS"
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    coveragepercent: numeric("coveragepercent", { precision: 5, scale: 2 })
      .notNull()
      .default("80.00"), // default 80% coverage
    api_endpoint: text("api_endpoint"),
    api_key: text("api_key"),
    edi_payer_id: text("edi_payer_id"),
    claim_submission_method: text("claim_submission_method"), // 'edi', 'api', 'portal', 'fax'
    pre_approval_required: boolean("pre_approval_required").notNull().default(true),
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("insurance_companies_ws_idx").on(table.workspaceid),
  })
);

export type InsuranceCompany = typeof insuranceCompanies.$inferSelect;
export type NewInsuranceCompany = typeof insuranceCompanies.$inferInsert;

// ── Patient insurance links ───────────────────────────────────────────
export const patientInsurance = pgTable(
  "patient_insurance",
  {
    patientinsuranceid: uuid("patientinsuranceid").primaryKey().defaultRandom(),
    patientid: uuid("patientid"),
    insuranceid: uuid("insuranceid"),
    policynumber: text("policynumber").notNull(),
    groupnumber: text("groupnumber"),
    startdate: date("startdate"),
    enddate: date("enddate"),
    isprimary: boolean("isprimary").notNull().default(true),
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    patientIdx: index("patient_insurance_patient_idx").on(table.patientid),
    insuranceIdx: index("patient_insurance_ins_idx").on(table.insuranceid),
  })
);

export type PatientInsurance = typeof patientInsurance.$inferSelect;
export type NewPatientInsurance = typeof patientInsurance.$inferInsert;

// ── Insurance pre-approvals ───────────────────────────────────────────
export const insurancePreApprovals = pgTable(
  "insurance_pre_approvals",
  {
    preapprovalid: uuid("preapprovalid").primaryKey().defaultRandom(),
    patientid: uuid("patientid"),
    insuranceid: uuid("insuranceid"),
    patientinsuranceid: uuid("patientinsuranceid"),
    request_date: timestamp("request_date", { withTimezone: true }).notNull().defaultNow(),
    authorization_number: text("authorization_number"),
    status: text("status").notNull().default("pending"), // 'pending', 'approved', 'denied', 'approved_with_conditions'
    cpt_codes: text("cpt_codes").array(),
    icd10_codes: text("icd10_codes").array(),
    authorized_amount: numeric("authorized_amount", { precision: 10, scale: 2 }),
    expiration_date: date("expiration_date"),
    conditions: text("conditions").array(),
    denial_reason: text("denial_reason"),
    appeal_deadline: date("appeal_deadline"),
    response_date: timestamp("response_date", { withTimezone: true }),
    clinical_justification: text("clinical_justification"),
    requested_services: jsonb("requested_services").$type<Record<string, unknown>>(),
    cost_breakdown: jsonb("cost_breakdown").$type<Record<string, unknown>>(),
    supporting_documents: text("supporting_documents").array(),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    patientIdx: index("insurance_pre_approvals_patient_idx").on(table.patientid),
    insuranceIdx: index("insurance_pre_approvals_ins_idx").on(table.insuranceid),
    statusIdx: index("insurance_pre_approvals_status_idx").on(table.status),
    authorizationNumberIdx: index("insurance_pre_approvals_auth_num_idx").on(table.authorization_number),
  })
);

export type InsurancePreApproval = typeof insurancePreApprovals.$inferSelect;
export type NewInsurancePreApproval = typeof insurancePreApprovals.$inferInsert;
