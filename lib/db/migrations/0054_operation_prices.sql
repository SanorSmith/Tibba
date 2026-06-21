CREATE TABLE IF NOT EXISTS "operation_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patientid" uuid NOT NULL REFERENCES "patients"("patientid") ON DELETE CASCADE,
  "workspaceid" uuid NOT NULL REFERENCES "workspaces"("workspaceid") ON DELETE CASCADE,
  "composition_uid" text,
  "operationname" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "currency" text DEFAULT 'USD',
  "notes" text,
  "createdat" timestamp with time zone DEFAULT now() NOT NULL
);
