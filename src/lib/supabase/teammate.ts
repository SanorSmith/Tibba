import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Teammate's Drizzle/PostgreSQL connection (server-side only)
const connectionString = process.env.OPENEHR_DATABASE_URL;

console.log('Teammate DB URL:', connectionString ? 'Set' : 'Not set');

// Create postgres client
export const postgresClient = connectionString 
  ? postgres(connectionString, { ssl: 'require' })
  : null;

// Create Drizzle instance
export const teammateDb = postgresClient 
  ? drizzle(postgresClient)
  : null;

// Helper function to execute queries using Drizzle
export async function executeTeammateQuery<T = any>(query: any): Promise<T[]> {
  if (!teammateDb) {
    throw new Error('Teammate database not configured');
  }
  
  try {
    const result = await query;
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    console.error('Error executing teammate query:', error);
    throw error;
  }
}
