/**
 * Direct PostgreSQL Database Client
 * Replaces Supabase SDK with direct postgres connections
 */

import postgres from 'postgres';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured. Please set TIBBNA_DATABASE_URL or DATABASE_URL');
}

// Create singleton connection
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Disable prepared statements for compatibility
});

export { sql };

// Database helper functions
export class DatabaseClient {
  private sql: ReturnType<typeof postgres>;

  constructor() {
    this.sql = sql;
  }

  // Generic select function
  async select(table: string, columns: string = '*', where?: any, orderBy?: string, limit?: number, offset?: number) {
    let query = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];

    if (where) {
      const whereConditions = Object.entries(where).map(([key, value], index) => {
        params.push(value);
        return `${key} = $${index + 1}`;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    if (offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }

    return await this.sql.unsafe(query, params);
  }

  // Generic insert function
  async insert(table: string, data: any) {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    return await this.sql.unsafe(query, values);
  }

  // Generic update function
  async update(table: string, data: any, where: any) {
    const setConditions = Object.entries(data).map(([key, value], index) => {
      return `${key} = $${index + 1}`;
    }).join(', ');

    const whereConditions = Object.entries(where).map(([key, value], index) => {
      return `${key} = $${Object.keys(data).length + index + 1}`;
    }).join(' AND ');

    const params = [...Object.values(data), ...Object.values(where)];
    const query = `UPDATE ${table} SET ${setConditions} WHERE ${whereConditions} RETURNING *`;
    
    return await this.sql.unsafe(query, params);
  }

  // Generic delete function
  async delete(table: string, where: any) {
    const whereConditions = Object.entries(where).map(([key, value], index) => {
      return `${key} = $${index + 1}`;
    }).join(' AND ');

    const params = Object.values(where);
    const query = `DELETE FROM ${table} WHERE ${whereConditions} RETURNING *`;
    
    return await this.sql.unsafe(query, params);
  }

  // Count function
  async count(table: string, where?: any) {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    if (where) {
      const whereConditions = Object.entries(where).map(([key, value], index) => {
        params.push(value);
        return `${key} = $${index + 1}`;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const [result] = await this.sql.unsafe(query, params);
    return parseInt(result.count);
  }

  // Raw query function
  async query(query: string, params: any[] = []) {
    return await this.sql.unsafe(query, params);
  }

  // Transaction support
  async transaction<T>(callback: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
    return await this.sql.begin(callback);
  }

  // Close connection
  async close() {
    await this.sql.end();
  }
}

// Export singleton instance
export const db = new DatabaseClient();

// Export types
export type DatabaseResult<T = any> = Promise<T[]>;
export type DatabaseSingle<T = any> = Promise<T | null>;
