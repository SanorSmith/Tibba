#!/usr/bin/env ts-node

import { teammateDb } from '../src/lib/supabase/teammate';
import fs from 'fs';
import path from 'path';

// Script to dump data from teammate's database
async function dumpDatabase() {
  console.log('Starting database dump...');
  
  try {
    if (!teammateDb) {
      console.error('Teammate database not configured');
      return;
    }
    
    // Get all tables first
    const tables = await teammateDb.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE_TABLE'
    `);
    
    console.log('Found tables:', (tables as any[]).map((t: any) => t.table_name));
    
    const dump: any = { tables: {}, timestamp: new Date().toISOString() };
    
    // Dump each table
    for (const table of tables as any[]) {
      const tableName = table.table_name;
      console.log(`Dumping table: ${tableName}`);
      
      const data = await teammateDb.execute(`SELECT * FROM ${tableName}`);
      dump.tables[tableName] = data;
      
      console.log(`  - ${(data as any[]).length} rows dumped`);
    }
    
    // Save dump to file
    const dumpPath = path.join(process.cwd(), 'database-dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2));
    
    console.log(`Database dump saved to: ${dumpPath}`);
    console.log('Total tables:', Object.keys(dump.tables).length);
    
  } catch (error) {
    console.error('Error dumping database:', error);
  }
}

if (require.main === module) {
  dumpDatabase();
}
