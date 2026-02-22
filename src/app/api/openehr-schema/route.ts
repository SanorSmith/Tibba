import { NextRequest, NextResponse } from 'next/server';

// This will connect to the OpenEHR database (TEAMMATE_DATABASE_URL)
const { Pool } = require('pg');

export async function GET(request: NextRequest) {
  const pool = new Pool({
    connectionString: process.env.TEAMMATE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Get all tables in the database
    const tablesQuery = `
      SELECT table_name, table_schema, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows;
    
    // Get detailed structure for each table
    const tableDetails = [];
    
    for (const table of tables) {
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [table.table_schema, table.table_name]);
      
      // Get primary key info
      const pkQuery = `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2;
      `;
      
      const pkResult = await client.query(pkQuery, [table.table_schema, table.table_name]);
      
      // Get foreign key info
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2;
      `;
      
      const fkResult = await client.query(fkQuery, [table.table_schema, table.table_name]);
      
      // Get sample records (limit to 5 for performance)
      let sampleRecords = [];
      try {
        const recordsQuery = `SELECT * FROM ${table.table_schema}.${table.table_name} LIMIT 5`;
        const recordsResult = await client.query(recordsQuery);
        sampleRecords = recordsResult.rows;
      } catch (recordError: any) {
        // Some tables might not be accessible or have issues
        console.warn(`Could not fetch records for ${table.table_name}:`, recordError.message);
        sampleRecords = [];
      }
      
      tableDetails.push({
        schema: table.table_schema,
        name: table.table_name,
        type: table.table_type,
        columns: columnsResult.rows,
        primary_key: pkResult.rows.map((row: any) => row.column_name),
        foreign_keys: fkResult.rows,
        sample_records: sampleRecords,
        record_count: sampleRecords.length
      });
    }
    
    client.release();
    
    return NextResponse.json({
      success: true,
      database: 'OpenEHR (TEAMMATE)',
      total_tables: tables.length,
      tables: tableDetails
    });
    
  } catch (error: any) {
    console.error('Error exploring OpenEHR database:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}
