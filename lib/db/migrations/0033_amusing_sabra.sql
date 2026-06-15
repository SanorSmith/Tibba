DO $$ BEGIN
 CREATE TYPE "public"."pharmacy_grn_status" AS ENUM('PENDING', 'PARTIAL', 'COMPLETE', 'CORRECTION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pharmacy_po_status" AS ENUM('PENDING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drug_interaction_logs" (
	"logid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid,
	"orderid" uuid,
	"drugs" jsonb NOT NULL,
	"interactions" jsonb NOT NULL,
	"interaction_count" text NOT NULL,
	"highest_severity" text,
	"pharmacist_id" uuid NOT NULL,
	"pharmacist_name" text NOT NULL,
	"decision" text NOT NULL,
	"justification" text,
	"acknowledged_risk" boolean DEFAULT false,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"dispensed_at" timestamp,
	"createdat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_allergies" (
	"allergyid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid NOT NULL,
	"allergen" text NOT NULL,
	"allergen_type" text NOT NULL,
	"reaction" text NOT NULL,
	"severity" text NOT NULL,
	"onset_date" timestamp,
	"notes" text,
	"verified_by" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	"createdby" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_medications" (
	"medicationid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid NOT NULL,
	"drugid" uuid,
	"drugname" text NOT NULL,
	"genericname" text,
	"strength" text,
	"form" text,
	"prescribed_by" text,
	"prescribed_date" timestamp,
	"dosage" text,
	"frequency" text,
	"route" text,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"discontinued_reason" text,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	"createdby" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insurance_reports" (
	"reportid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientid" uuid NOT NULL,
	"reporttype" text NOT NULL,
	"insurancecompany" text NOT NULL,
	"diagnosis" text NOT NULL,
	"clinicalfindings" text,
	"treatmentplan" text,
	"medications" text,
	"investigations" text,
	"prognosis" text,
	"workstatus" text,
	"recommendations" text,
	"reportdata" jsonb,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insurance_pre_approvals" (
	"preapprovalid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientid" uuid,
	"insuranceid" uuid,
	"patientinsuranceid" uuid,
	"request_date" timestamp with time zone DEFAULT now() NOT NULL,
	"authorization_number" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"cpt_codes" text[],
	"icd10_codes" text[],
	"authorized_amount" numeric(10, 2),
	"expiration_date" date,
	"conditions" text[],
	"denial_reason" text,
	"appeal_deadline" date,
	"response_date" timestamp with time zone,
	"clinical_justification" text,
	"requested_services" jsonb,
	"cost_breakdown" jsonb,
	"supporting_documents" text[],
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_claim_damage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"item_id" uuid,
	"item_name" varchar(200),
	"quantity" integer DEFAULT 0,
	"note" varchar(200),
	"createdat" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_goods_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"order_id" uuid,
	"order_number" varchar(50),
	"delivery_note_number" varchar(100),
	"received_by" varchar(120) NOT NULL,
	"receipt_date" timestamp with time zone DEFAULT now(),
	"supplier_name" varchar(200),
	"supplier_email" varchar(200),
	"status" "pharmacy_grn_status" DEFAULT 'PENDING',
	"notes" text,
	"is_reversal" boolean DEFAULT false,
	"correction_of" uuid,
	"correction_reason" text,
	"corrected_by" varchar(120),
	"correction_type" varchar(20),
	"createdat" timestamp with time zone DEFAULT now(),
	"updatedat" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"item_id" uuid,
	"item_name" varchar(200),
	"uom" varchar(50),
	"ordered_qty" integer DEFAULT 0,
	"received_qty" integer DEFAULT 0 NOT NULL,
	"delivered_total" integer,
	"return_claim" integer DEFAULT 0,
	"dn_reg_num" varchar(100),
	"unit_cost" numeric(10, 2),
	"batch_number" varchar(100),
	"lot_number" varchar(100),
	"expiry_date" timestamp with time zone,
	"manufacture_date" timestamp with time zone,
	"notes" text,
	"correction_of_item_id" uuid,
	"createdat" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid,
	"item_name" varchar(200),
	"uom" varchar(50),
	"ordered_qty" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(10, 2),
	"total_cost" numeric(12, 2),
	"notes" text,
	"createdat" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"ordered_by" varchar(120) NOT NULL,
	"order_date" timestamp with time zone DEFAULT now(),
	"expected_date" timestamp with time zone,
	"supplier_id" uuid,
	"supplier_name" varchar(200),
	"supplier_email" varchar(200),
	"supplier_phone" varchar(50),
	"status" "pharmacy_po_status" DEFAULT 'PENDING',
	"notes" text,
	"total_amount" numeric(12, 2) DEFAULT '0',
	"is_edited" boolean DEFAULT false,
	"cancel_reason" text,
	"createdat" timestamp with time zone DEFAULT now(),
	"updatedat" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_refund_transactions" (
	"refundtransactionid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"returnid" uuid NOT NULL,
	"refundamount" numeric(12, 2) NOT NULL,
	"refundmethod" text NOT NULL,
	"paymentreference" text,
	"cardlast4" text,
	"storecreditcode" text,
	"transactiondate" timestamp with time zone DEFAULT now() NOT NULL,
	"processedby" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_return_items" (
	"returnitemid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"returnid" uuid NOT NULL,
	"originalsaleitemid" uuid,
	"drugid" uuid,
	"drugname" text NOT NULL,
	"batchid" uuid,
	"lotnumber" text,
	"quantityreturned" integer NOT NULL,
	"originalquantity" integer,
	"unitprice" numeric(10, 2) NOT NULL,
	"totalprice" numeric(10, 2) NOT NULL,
	"itemcondition" text DEFAULT 'OPENED',
	"restockeligible" boolean DEFAULT true NOT NULL,
	"restocked" boolean DEFAULT false NOT NULL,
	"itemnotes" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_return_reasons" (
	"reasonid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"reasoncode" text NOT NULL,
	"reasonname" text NOT NULL,
	"reasondescription" text,
	"requiresapproval" boolean DEFAULT false NOT NULL,
	"allowsexchange" boolean DEFAULT true NOT NULL,
	"applyrestockingfee" boolean DEFAULT false NOT NULL,
	"restockingfeepercentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"displayorder" integer DEFAULT 0 NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_returns" (
	"returnid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"returnnumber" text NOT NULL,
	"workspaceid" uuid NOT NULL,
	"originalsaleid" uuid NOT NULL,
	"originalsalenumber" text,
	"originalsaledate" timestamp with time zone,
	"returntype" text NOT NULL,
	"returndate" timestamp with time zone DEFAULT now() NOT NULL,
	"returnreasonid" uuid,
	"returnnotes" text,
	"patientid" uuid,
	"customername" text,
	"customerphone" text,
	"totalreturnamount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"restockingfee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"refundamount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"refundmethod" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"requiresapproval" boolean DEFAULT false NOT NULL,
	"approvedby" uuid,
	"approvedat" timestamp with time zone,
	"rejectionreason" text,
	"processedby" uuid,
	"processedat" timestamp with time zone,
	"shiftid" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_returns_returnnumber_unique" UNIQUE("returnnumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_receipt_reprints" (
	"reprintid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"saleid" uuid,
	"returnid" uuid,
	"shiftid" uuid,
	"receipttype" text NOT NULL,
	"reprintdate" timestamp with time zone DEFAULT now() NOT NULL,
	"cashierid" uuid NOT NULL,
	"printformat" text NOT NULL,
	"reason" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_package_items" (
	"itemid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"packageid" uuid NOT NULL,
	"testcode" varchar(50) NOT NULL,
	"testname" varchar(255) NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_packages" (
	"packageid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"packagename" varchar(255) NOT NULL,
	"description" text,
	"labtype" varchar(100),
	"price" numeric(10, 2) NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdby" uuid NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedby" uuid,
	"updatedat" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "insurance_companies" DROP CONSTRAINT "insurance_companies_workspaceid_workspaces_workspaceid_fk";
--> statement-breakpoint
ALTER TABLE "patient_insurance" DROP CONSTRAINT "patient_insurance_patientid_patients_patientid_fk";
--> statement-breakpoint
ALTER TABLE "patient_insurance" DROP CONSTRAINT "patient_insurance_insuranceid_insurance_companies_insuranceid_fk";
--> statement-breakpoint
ALTER TABLE "pos_sale_items" DROP CONSTRAINT "pos_sale_items_batchid_drug_batches_batchid_fk";
--> statement-breakpoint
ALTER TABLE "insurance_companies" ALTER COLUMN "workspaceid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_insurance" ALTER COLUMN "patientid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_insurance" ALTER COLUMN "insuranceid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_sale_items" ALTER COLUMN "drugid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "global_drugs" ADD COLUMN "route" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "itemid" uuid;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "route" text;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "api_endpoint" text;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "api_key" text;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "edi_payer_id" text;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "claim_submission_method" text;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "pre_approval_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ADD COLUMN "quantitydispensed" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD COLUMN "isactive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "isactive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "isactive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "price" numeric(10, 2);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "insurance_reports" ADD CONSTRAINT "insurance_reports_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_claim_damage" ADD CONSTRAINT "pharmacy_claim_damage_receipt_id_pharmacy_goods_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."pharmacy_goods_receipt"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_goods_receipt" ADD CONSTRAINT "pharmacy_goods_receipt_order_id_pharmacy_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pharmacy_purchase_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_goods_receipt_items" ADD CONSTRAINT "pharmacy_goods_receipt_items_receipt_id_pharmacy_goods_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."pharmacy_goods_receipt"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_purchase_order_items" ADD CONSTRAINT "pharmacy_purchase_order_items_order_id_pharmacy_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pharmacy_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_refund_transactions" ADD CONSTRAINT "pos_refund_transactions_returnid_pos_returns_returnid_fk" FOREIGN KEY ("returnid") REFERENCES "public"."pos_returns"("returnid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_refund_transactions" ADD CONSTRAINT "pos_refund_transactions_processedby_users_userid_fk" FOREIGN KEY ("processedby") REFERENCES "public"."users"("userid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_returnid_pos_returns_returnid_fk" FOREIGN KEY ("returnid") REFERENCES "public"."pos_returns"("returnid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_originalsaleitemid_pos_sale_items_itemid_fk" FOREIGN KEY ("originalsaleitemid") REFERENCES "public"."pos_sale_items"("itemid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_return_reasons" ADD CONSTRAINT "pos_return_reasons_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_originalsaleid_pos_sales_saleid_fk" FOREIGN KEY ("originalsaleid") REFERENCES "public"."pos_sales"("saleid") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_returnreasonid_pos_return_reasons_reasonid_fk" FOREIGN KEY ("returnreasonid") REFERENCES "public"."pos_return_reasons"("reasonid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_approvedby_users_userid_fk" FOREIGN KEY ("approvedby") REFERENCES "public"."users"("userid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_processedby_users_userid_fk" FOREIGN KEY ("processedby") REFERENCES "public"."users"("userid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_shiftid_pos_shifts_shiftid_fk" FOREIGN KEY ("shiftid") REFERENCES "public"."pos_shifts"("shiftid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_receipt_reprints" ADD CONSTRAINT "pos_receipt_reprints_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_receipt_reprints" ADD CONSTRAINT "pos_receipt_reprints_saleid_pos_sales_saleid_fk" FOREIGN KEY ("saleid") REFERENCES "public"."pos_sales"("saleid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_receipt_reprints" ADD CONSTRAINT "pos_receipt_reprints_returnid_pos_returns_returnid_fk" FOREIGN KEY ("returnid") REFERENCES "public"."pos_returns"("returnid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_receipt_reprints" ADD CONSTRAINT "pos_receipt_reprints_shiftid_pos_shifts_shiftid_fk" FOREIGN KEY ("shiftid") REFERENCES "public"."pos_shifts"("shiftid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_receipt_reprints" ADD CONSTRAINT "pos_receipt_reprints_cashierid_users_userid_fk" FOREIGN KEY ("cashierid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_package_items" ADD CONSTRAINT "test_package_items_packageid_test_packages_packageid_fk" FOREIGN KEY ("packageid") REFERENCES "public"."test_packages"("packageid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insurance_pre_approvals_patient_idx" ON "insurance_pre_approvals" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insurance_pre_approvals_ins_idx" ON "insurance_pre_approvals" USING btree ("insuranceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insurance_pre_approvals_status_idx" ON "insurance_pre_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insurance_pre_approvals_auth_num_idx" ON "insurance_pre_approvals" USING btree ("authorization_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_refund_trans_return" ON "pos_refund_transactions" USING btree ("returnid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_refund_trans_method" ON "pos_refund_transactions" USING btree ("refundmethod");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_return_items_return" ON "pos_return_items" USING btree ("returnid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_return_items_drug" ON "pos_return_items" USING btree ("drugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_return_reasons_workspace" ON "pos_return_reasons" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_return_reasons_active" ON "pos_return_reasons" USING btree ("isactive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_workspace" ON "pos_returns" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_original_sale" ON "pos_returns" USING btree ("originalsaleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_date" ON "pos_returns" USING btree ("returndate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_status" ON "pos_returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_number" ON "pos_returns" USING btree ("returnnumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_returns_shift" ON "pos_returns" USING btree ("shiftid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_receipt_reprints_workspace" ON "pos_receipt_reprints" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_receipt_reprints_sale" ON "pos_receipt_reprints" USING btree ("saleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_receipt_reprints_return" ON "pos_receipt_reprints" USING btree ("returnid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_receipt_reprints_shift" ON "pos_receipt_reprints" USING btree ("shiftid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_receipt_reprints_date" ON "pos_receipt_reprints" USING btree ("reprintdate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_receipt_reprints_cashier" ON "pos_receipt_reprints" USING btree ("cashierid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_package_items_package_idx" ON "test_package_items" USING btree ("packageid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_package_items_testcode_idx" ON "test_package_items" USING btree ("testcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_packages_workspace_idx" ON "test_packages" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_packages_packagename_idx" ON "test_packages" USING btree ("packagename");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_packages_active_idx" ON "test_packages" USING btree ("isactive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drugs_item_idx" ON "drugs" USING btree ("itemid");--> statement-breakpoint
ALTER TABLE "global_drugs" DROP COLUMN IF EXISTS "description";--> statement-breakpoint
ALTER TABLE "drugs" DROP COLUMN IF EXISTS "description";