CREATE TABLE IF NOT EXISTS "emergency_doctor_availability" (
	"availabilityid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"doctorid" uuid NOT NULL,
	"isavailable" boolean DEFAULT true NOT NULL,
	"shiftstart" timestamp with time zone,
	"shiftend" timestamp with time zone,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emergency_doctor_assignments" (
	"assignmentid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"visitid" text NOT NULL,
	"patientid" uuid NOT NULL,
	"doctorid" uuid NOT NULL,
	"assignedat" timestamp with time zone DEFAULT now() NOT NULL,
	"assignedby" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_doctor_availability" ADD CONSTRAINT "emergency_doctor_availability_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_doctor_availability" ADD CONSTRAINT "emergency_doctor_availability_doctorid_users_userid_fk" FOREIGN KEY ("doctorid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_doctor_assignments" ADD CONSTRAINT "emergency_doctor_assignments_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_doctor_assignments" ADD CONSTRAINT "emergency_doctor_assignments_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_doctor_assignments" ADD CONSTRAINT "emergency_doctor_assignments_doctorid_users_userid_fk" FOREIGN KEY ("doctorid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_doctor_assignments" ADD CONSTRAINT "emergency_doctor_assignments_assignedby_users_userid_fk" FOREIGN KEY ("assignedby") REFERENCES "public"."users"("userid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "emergency_doctor_assignments" ADD CONSTRAINT "emergency_doctor_assignments_visitid_unique" UNIQUE("visitid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emergency_doctor_availability_workspace" ON "emergency_doctor_availability" USING btree ("workspaceid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emergency_doctor_availability_doctor" ON "emergency_doctor_availability" USING btree ("doctorid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emergency_doctor_assignments_visit" ON "emergency_doctor_assignments" USING btree ("visitid");
