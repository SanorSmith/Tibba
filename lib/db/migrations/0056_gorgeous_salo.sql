CREATE TABLE IF NOT EXISTS "workspace_roles" (
	"roleid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspacetype" text NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"lablear" text,
	"labelku" text,
	"description" text,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_roles_type_name_unique" UNIQUE("workspacetype","name")
);
--> statement-breakpoint
ALTER TABLE "lims_orders" ADD COLUMN "blood_type" text;--> statement-breakpoint
ALTER TABLE "lims_orders" ADD COLUMN "blood_comment" text;