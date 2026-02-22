#!/usr/bin/env ts-node

import { teammateDb } from '../src/lib/supabase/teammate';
import fs from 'fs';
import path from 'path';

// Script to restore dumped data to your local database
async function restoreToLocalDatabase() {
  console.log('Starting database restore...');
  
  try {
    // Read the dump file
    const dumpPath = path.join(process.cwd(), 'database-dump.json');
    if (!fs.existsSync(dumpPath)) {
      console.error('Dump file not found. Run dump-neon-data.ts first.');
      return;
    }
    
    const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
    console.log(`Restoring dump from: ${dump.timestamp}`);
    
    if (!teammateDb) {
      console.error('Teammate database not configured');
      return;
    }
    
    // Restore each table
    for (const [tableName, data] of Object.entries(dump.tables)) {
      console.log(`Restoring table: ${tableName}`);
      
      if (Array.isArray(data) && data.length > 0) {
        // Get column names from first row
        const columns = Object.keys((data as any[])[0]);
        const columnNames = columns.join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // Clear existing data
        await teammateDb.execute(`DELETE FROM ${tableName}`);
        
        // Insert data row by row
        for (const row of data as any[]) {
          const values = columns.map(col => row[col]);
          await teammateDb.execute(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`
          );
        }
        
        console.log(`  - ${data.length} rows restored`);
      }
    }
    
    console.log('Database restore completed successfully!');
    
  } catch (error) {
    console.error('Error restoring database:', error);
  }
}

if (require.main === module) {
  restoreToLocalDatabase();
}
