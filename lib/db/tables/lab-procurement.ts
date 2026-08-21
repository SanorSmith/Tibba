/**
 * Lab procurement — purchase orders and goods receipt for lab reagents and
 * consumables.
 *
 * Mirrors lib/db/tables/pharmacy-procurement.ts so receiving works the same
 * way on both sides, but with its own tables and its own enums. Every table
 * carries workspace_id: a lab only ever sees its own orders and deliveries.
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  numeric,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const labPoStatusEnum = pgEnum("lab_po_status", [
  "PENDING", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED",
]);

export const labGrnStatusEnum = pgEnum("lab_grn_status", [
  "PENDING", "PARTIAL", "COMPLETE", "CORRECTION",
]);

// ─── Lab Purchase Orders ──────────────────────────────────────────────────────

export const labPurchaseOrders = pgTable("lab_purchase_orders", {
  id:            uuid("id").primaryKey().defaultRandom(),
  workspaceid:   uuid("workspace_id").notNull(),
  ordernumber:   varchar("order_number", { length: 50 }).notNull(),
  orderedby:     varchar("ordered_by", { length: 120 }).notNull(),
  orderdate:     timestamp("order_date", { withTimezone: true }).defaultNow(),
  expecteddate:  timestamp("expected_date", { withTimezone: true }),
  supplierid:    uuid("supplier_id"),
  suppliername:  varchar("supplier_name", { length: 200 }),
  supplieremail: varchar("supplier_email", { length: 200 }),
  supplierphone: varchar("supplier_phone", { length: 50 }),
  status:        labPoStatusEnum("status").default("PENDING"),
  notes:         text("notes"),
  totalamount:   numeric("total_amount", { precision: 12, scale: 2 }).default("0"),
  isedited:      boolean("is_edited").default(false),
  cancelreason:  text("cancel_reason"),
  createdat:     timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:     timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Lab Purchase Order Items ─────────────────────────────────────────────────

export const labPurchaseOrderItems = pgTable("lab_purchase_order_items", {
  id:         uuid("id").primaryKey().defaultRandom(),
  orderid:    uuid("order_id").notNull().references(() => labPurchaseOrders.id, { onDelete: "cascade" }),
  itemid:     uuid("item_id"),
  itemname:   varchar("item_name", { length: 200 }),
  uom:        varchar("uom", { length: 50 }),
  orderedqty: integer("ordered_qty").notNull().default(0),
  unitcost:   numeric("unit_cost", { precision: 10, scale: 2 }),
  totalcost:  numeric("total_cost", { precision: 12, scale: 2 }),
  notes:      text("notes"),
  createdat:  timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Lab Goods Receipt ────────────────────────────────────────────────────────

export const labGoodsReceipt = pgTable("lab_goods_receipt", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  workspaceid:        uuid("workspace_id").notNull(),
  receiptnumber:      varchar("receipt_number", { length: 50 }).notNull(),
  orderid:            uuid("order_id").references(() => labPurchaseOrders.id),
  ordernumber:        varchar("order_number", { length: 50 }),
  deliverynotenumber: varchar("delivery_note_number", { length: 100 }),
  receivedby:         varchar("received_by", { length: 120 }).notNull(),
  receiptdate:        timestamp("receipt_date", { withTimezone: true }).defaultNow(),
  suppliername:       varchar("supplier_name", { length: 200 }),
  supplieremail:      varchar("supplier_email", { length: 200 }),
  status:             labGrnStatusEnum("status").default("PENDING"),
  notes:              text("notes"),
  isreversal:         boolean("is_reversal").default(false),
  correctionof:       uuid("correction_of"),
  correctionreason:   text("correction_reason"),
  correctedby:        varchar("corrected_by", { length: 120 }),
  correctiontype:     varchar("correction_type", { length: 20 }),
  createdat:          timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:          timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Lab Goods Receipt Items ──────────────────────────────────────────────────

export const labGoodsReceiptItems = pgTable("lab_goods_receipt_items", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  receiptid:          uuid("receipt_id").notNull().references(() => labGoodsReceipt.id, { onDelete: "cascade" }),
  itemid:             uuid("item_id"),
  itemname:           varchar("item_name", { length: 200 }),
  uom:                varchar("uom", { length: 50 }),
  orderedqty:         integer("ordered_qty").default(0),
  receivedqty:        integer("received_qty").notNull().default(0),
  returnclaim:        integer("return_claim").default(0),
  dnregnum:           varchar("dn_reg_num", { length: 100 }),
  unitcost:           numeric("unit_cost", { precision: 10, scale: 2 }),
  batchnumber:        varchar("batch_number", { length: 100 }),
  lotnumber:          varchar("lot_number", { length: 100 }),
  expirydate:         timestamp("expiry_date", { withTimezone: true }),
  manufacturedate:    timestamp("manufacture_date", { withTimezone: true }),
  notes:              text("notes"),
  correctionofitemid: uuid("correction_of_item_id"),
  createdat:          timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Lab Claim / Damage ───────────────────────────────────────────────────────
// Reagent arriving broken or short is common enough that it needs recording
// against the delivery rather than quietly reducing what goes on the shelf.

export const labClaimDamage = pgTable("lab_claim_damage", {
  id:        uuid("id").primaryKey().defaultRandom(),
  receiptid: uuid("receipt_id").notNull().references(() => labGoodsReceipt.id, { onDelete: "cascade" }),
  itemid:    uuid("item_id"),
  itemname:  varchar("item_name", { length: 200 }),
  quantity:  integer("quantity").default(0),
  note:      varchar("note", { length: 200 }),
  createdat: timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type LabPurchaseOrder = typeof labPurchaseOrders.$inferSelect;
export type NewLabPurchaseOrder = typeof labPurchaseOrders.$inferInsert;
export type LabPurchaseOrderItem = typeof labPurchaseOrderItems.$inferSelect;
export type NewLabPurchaseOrderItem = typeof labPurchaseOrderItems.$inferInsert;
export type LabGoodsReceiptType = typeof labGoodsReceipt.$inferSelect;
export type NewLabGoodsReceipt = typeof labGoodsReceipt.$inferInsert;
export type LabGoodsReceiptItem = typeof labGoodsReceiptItems.$inferSelect;
export type NewLabGoodsReceiptItem = typeof labGoodsReceiptItems.$inferInsert;
export type LabClaimDamageType = typeof labClaimDamage.$inferSelect;
export type NewLabClaimDamage = typeof labClaimDamage.$inferInsert;

// ─── Vendor Returns & Claims ──────────────────────────────────────────────────
// See migration 0060. Returns send stock back; claims track the money side of
// damaged goods separately, so negotiation never rewrites the physical record
// of what actually arrived broken (lab_claim_damage).

export const labReturnStatusEnum = pgEnum("lab_return_status", [
  "DRAFT", "SENT", "ACCEPTED", "REJECTED", "CREDITED",
]);

export const labClaimStatusEnum = pgEnum("lab_claim_status", [
  "OPEN", "SUBMITTED", "APPROVED", "REJECTED", "SETTLED",
]);

export const labVendorReturns = pgTable("lab_vendor_returns", {
  id:             uuid("id").primaryKey().defaultRandom(),
  workspaceid:    uuid("workspace_id").notNull(),
  returnnumber:   varchar("return_number", { length: 50 }).notNull(),
  vendorid:       uuid("vendor_id"),
  vendorname:     varchar("vendor_name", { length: 200 }),
  receiptid:      uuid("receipt_id"),
  warehouseid:    uuid("warehouse_id"),
  status:         labReturnStatusEnum("status").default("DRAFT"),
  reason:         text("reason"),
  totalvalue:     numeric("total_value", { precision: 12, scale: 2 }).default("0"),
  returnedby:     uuid("returned_by"),
  returnedbyname: varchar("returned_by_name", { length: 200 }),
  notes:          text("notes"),
  createdat:      timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:      timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

export const labVendorReturnItems = pgTable("lab_vendor_return_items", {
  id:          uuid("id").primaryKey().defaultRandom(),
  returnid:    uuid("return_id").notNull().references(() => labVendorReturns.id, { onDelete: "cascade" }),
  itemid:      uuid("item_id"),
  itemname:    varchar("item_name", { length: 200 }),
  batchid:     uuid("batch_id"),
  batchnumber: varchar("batch_number", { length: 100 }),
  quantity:    integer("quantity").notNull().default(0),
  unitcost:    numeric("unit_cost", { precision: 10, scale: 2 }),
  reason:      text("reason"),
  createdat:   timestamp("createdat", { withTimezone: true }).defaultNow(),
});

export const labClaims = pgTable("lab_claims", {
  id:            uuid("id").primaryKey().defaultRandom(),
  workspaceid:   uuid("workspace_id").notNull(),
  claimnumber:   varchar("claim_number", { length: 50 }).notNull(),
  vendorid:      uuid("vendor_id"),
  vendorname:    varchar("vendor_name", { length: 200 }),
  receiptid:     uuid("receipt_id"),
  status:        labClaimStatusEnum("status").default("OPEN"),
  claimamount:   numeric("claim_amount", { precision: 12, scale: 2 }).default("0"),
  settledamount: numeric("settled_amount", { precision: 12, scale: 2 }),
  reason:        text("reason"),
  resolution:    text("resolution"),
  raisedby:      uuid("raised_by"),
  raisedbyname:  varchar("raised_by_name", { length: 200 }),
  createdat:     timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:     timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

export type LabVendorReturn = typeof labVendorReturns.$inferSelect;
export type LabClaim = typeof labClaims.$inferSelect;
