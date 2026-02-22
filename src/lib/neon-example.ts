import { executeTeammateQuery, teammateDb } from './supabase/teammate';

// Example usage of teammate's database
export async function getTeammateData() {
  try {
    // Example: Get all users from their database
    if (!teammateDb) {
      console.error('Teammate database not configured');
      return [];
    }
    
    // You would need to import their schema or use raw SQL
    const users = await teammateDb.execute('SELECT * FROM users LIMIT 10');
    return users;
  } catch (error) {
    console.error('Error fetching teammate data:', error);
    return [];
  }
}

// Example: Get specific table data
export async function getTableData(tableName: string, limit = 50) {
  try {
    if (!teammateDb) {
      console.error('Teammate database not configured');
      return [];
    }
    
    const query = `SELECT * FROM ${tableName} LIMIT ${limit}`;
    const data = await teammateDb.execute(query);
    return data;
  } catch (error) {
    console.error(`Error fetching data from ${tableName}:`, error);
    return [];
  }
}

// Example: Execute custom query
export async function executeCustomQuery(query: string, params?: any[]) {
  try {
    if (!teammateDb) {
      console.error('Teammate database not configured');
      return [];
    }
    
    const result = await teammateDb.execute(query);
    return result;
  } catch (error) {
    console.error('Error executing custom query:', error);
    return [];
  }
}
