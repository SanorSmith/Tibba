/**
 * Pharmacy tenant-aware database helper.
 *
 * Provides a raw `postgres` client and the withPharmacySchema helper
 * for use in pharmacy API routes.
 */
import postgres from "postgres";
import {
  getPharmacySchemaName,
  provisionPharmacySchema,
  withPharmacySchema,
} from "./pharmacy-tenant";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pharmacySql = postgres(
  dbUrl.includes("sslmode=") ? dbUrl : `${dbUrl}?sslmode=require`
);

export { getPharmacySchemaName, provisionPharmacySchema, withPharmacySchema };
