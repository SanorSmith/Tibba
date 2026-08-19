/**
 * Lab POS — shifts and payments.
 *
 * Payments attach to the general `invoices` rows the Lab Billing tab creates.
 * See migration 0059 for why there is no parallel sale record.
 */
import { pgTable, uuid, varchar, text, numeric, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const labPaymentMethodEnum = pgEnum("lab_payment_method", [
  "CASH", "CARD", "INSURANCE", "TRANSFER",
]);

export const labShiftStatusEnum = pgEnum("lab_shift_status", ["OPEN", "CLOSED"]);

export const labShifts = pgTable("lab_shifts", {
  id:             uuid("id").primaryKey().defaultRandom(),
  workspaceid:    uuid("workspace_id").notNull(),
  shiftnumber:    varchar("shift_number", { length: 50 }).notNull(),
  cashierid:      uuid("cashier_id"),
  cashiername:    varchar("cashier_name", { length: 200 }),
  status:         labShiftStatusEnum("status").default("OPEN"),
  openingtime:    timestamp("opening_time", { withTimezone: true }).defaultNow(),
  closingtime:    timestamp("closing_time", { withTimezone: true }),
  openingcash:    numeric("opening_cash", { precision: 12, scale: 2 }).default("0"),
  expectedcash:   numeric("expected_cash", { precision: 12, scale: 2 }),
  actualcash:     numeric("actual_cash", { precision: 12, scale: 2 }),
  variance:       numeric("variance", { precision: 12, scale: 2 }),
  variancereason: text("variance_reason"),
  notes:          text("notes"),
  createdat:      timestamp("createdat", { withTimezone: true }).defaultNow(),
});

export const labPayments = pgTable("lab_payments", {
  id:               uuid("id").primaryKey().defaultRandom(),
  workspaceid:      uuid("workspace_id").notNull(),
  invoiceid:        uuid("invoice_id").notNull(),
  shiftid:          uuid("shift_id").references(() => labShifts.id),
  amount:           numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method:           labPaymentMethodEnum("method").notNull(),
  cardlast4:        varchar("card_last4", { length: 4 }),
  reference:        varchar("reference", { length: 120 }),
  insurancecompany: varchar("insurance_company", { length: 200 }),
  insurancecovered: numeric("insurance_covered", { precision: 12, scale: 2 }),
  patientcopay:     numeric("patient_copay", { precision: 12, scale: 2 }),
  isrefund:         boolean("is_refund").default(false),
  refundof:         uuid("refund_of"),
  refundreason:     text("refund_reason"),
  receivedby:       uuid("received_by"),
  receivedbyname:   varchar("received_by_name", { length: 200 }),
  notes:            text("notes"),
  createdat:        timestamp("createdat", { withTimezone: true }).defaultNow(),
});

export type LabShift = typeof labShifts.$inferSelect;
export type NewLabShift = typeof labShifts.$inferInsert;
export type LabPayment = typeof labPayments.$inferSelect;
export type NewLabPayment = typeof labPayments.$inferInsert;
