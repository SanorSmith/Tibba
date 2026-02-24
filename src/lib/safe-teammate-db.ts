import { teammateDb } from './supabase/teammate';

// Safe operations that only modify data, NOT schema
export class SafeTeammateDB {
  private static instance: SafeTeammateDB;
  
  static getInstance(): SafeTeammateDB {
    if (!SafeTeammateDB.instance) {
      SafeTeammateDB.instance = new SafeTeammateDB();
    }
    return SafeTeammateDB.instance;
  }

  // ✅ SAFE: Read operations
  async select(table: string, columns: string = '*', where?: string, limit?: number) {
    this.validateTableName(table);
    this.validateSelectQuery(columns, where);
    
    let query = `SELECT ${columns} FROM "${table}"`;
    if (where) {
      query += ` WHERE ${where}`;
    }
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    return await teammateDb!.execute(query);
  }

  // ✅ SAFE: Insert records (no schema changes)
  async insert(table: string, data: Record<string, any>) {
    this.validateTableName(table);
    this.validateInsertData(data);
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return await teammateDb!.execute(query);
  }

  // ✅ SAFE: Update records (no schema changes)
  async update(table: string, data: Record<string, any>, where: string) {
    this.validateTableName(table);
    this.validateUpdateData(data);
    this.validateWhereClause(where);
    
    const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(data)];
    
    const query = `UPDATE "${table}" SET ${setClause} WHERE ${where} RETURNING *`;
    return await teammateDb!.execute(query);
  }

  // ✅ SAFE: Delete records (no schema changes)
  async delete(table: string, where: string) {
    this.validateTableName(table);
    this.validateWhereClause(where);
    
    const query = `DELETE FROM "${table}" WHERE ${where} RETURNING *`;
    return await teammateDb!.execute(query);
  }

  // ❌ DANGEROUS: Schema modification operations (blocked)
  private async blockSchemaOperations(operation: string) {
    throw new Error(`🚨 SCHEMA OPERATION BLOCKED: ${operation} is not allowed. You can only modify data, not database structure.`);
  }

  // Validation methods
  private validateTableName(table: string) {
    const allowedTables = [
      'users', 'workspaces', 'patients', 'appointments', 
      'staff', 'departments', 'lab', 'pharmacy', 'operations', 'todo',
      // Non-Medical DB tables (read-only access)
      'ehr', 'composition', 'archetype', 'folder', 'party_identified',
      'participation', 'audit_details', 'object_version_id', 'versioned_object',
      'contribution', 'demographic', 'party', 'actor_role', 'relationship'
    ];
    
    if (!allowedTables.includes(table)) {
      throw new Error(`❌ Table "${table}" is not in the allowed list`);
    }
    
    // Protect Non-Medical DB system tables
    const nonMedicalSystemTables = [
      'ehr', 'composition', 'archetype', 'folder', 'party_identified',
      'participation', 'audit_details', 'object_version_id', 'versioned_object',
      'contribution', 'demographic', 'party', 'actor_role', 'relationship'
    ];
    
    if (nonMedicalSystemTables.includes(table)) {
      // Allow only SELECT operations on Non-Medical DB system tables
      const caller = new Error().stack;
      if (caller && !caller.includes('select') && !caller.includes('readRecords')) {
        throw new Error(`🚨 Non-Medical DB system table "${table}" is READ-ONLY. Only SELECT operations allowed.`);
      }
    }
  }

  private validateSelectQuery(columns: string, where?: string) {
    // Block dangerous keywords
    const dangerousKeywords = ['DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT'];
    const query = `${columns} ${where || ''}`.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (query.includes(keyword)) {
        throw new Error(`❌ Dangerous keyword "${keyword}" not allowed in SELECT queries`);
      }
    }
  }

  private validateInsertData(data: Record<string, any>) {
    // Ensure no SQL injection in column names
    for (const key of Object.keys(data)) {
      if (key.includes(';') || key.includes('--') || key.includes('/*')) {
        throw new Error(`❌ Invalid column name: ${key}`);
      }
    }
  }

  private validateUpdateData(data: Record<string, any>) {
    // Similar validation as insert
    this.validateInsertData(data);
  }

  private validateWhereClause(where: string) {
    // Basic SQL injection protection
    if (where.includes(';') || where.includes('--') || where.includes('/*')) {
      throw new Error(`❌ Invalid WHERE clause: ${where}`);
    }
  }

  // Public API for safe operations
  async createRecord(table: string, data: Record<string, any>) {
    return this.insert(table, data);
  }

  async readRecords(table: string, options?: { columns?: string; where?: string; limit?: number }) {
    return this.select(
      table, 
      options?.columns || '*', 
      options?.where, 
      options?.limit
    );
  }

  async updateRecords(table: string, data: Record<string, any>, where: string) {
    return this.update(table, data, where);
  }

  async deleteRecords(table: string, where: string) {
    return this.delete(table, where);
  }
}

// Export singleton instance
export const safeTeammateDB = SafeTeammateDB.getInstance();
