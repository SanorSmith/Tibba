import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = postgres(dbUrl.includes("sslmode=") ? dbUrl : `${dbUrl}?sslmode=require`);
export const db = drizzle(client, { schema });

// Export the raw client for cleanup purposes
export const rawClient = client;
