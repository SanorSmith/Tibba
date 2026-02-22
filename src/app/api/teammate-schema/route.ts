import { NextRequest, NextResponse } from 'next/server';
import { teammateDb } from '@/lib/supabase/teammate';

export async function GET(request: NextRequest) {
  try {
    if (!teammateDb) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get all tables
    const tables = await teammateDb.execute(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    // Get detailed schema for each table
    const schemaDetails = [];
    
    for (const table of tables as any[]) {
      const tableName = table.table_name;
      
      // Get columns for this table
      const columns = await teammateDb.execute(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      // Get row count
      const countResult = await teammateDb.execute(`
        SELECT COUNT(*) as count FROM "${tableName}"
      `);

      // Get sample data (first 3 rows)
      let sampleData = [];
      try {
        sampleData = await teammateDb.execute(`
          SELECT * FROM "${tableName}" LIMIT 3
        `);
      } catch (error) {
        // Skip sample data if table is not accessible
      }

      schemaDetails.push({
        tableName,
        tableType: table.table_type,
        rowCount: (countResult as any[])[0]?.count || 0,
        columns: columns,
        sampleData: sampleData
      });
    }

    return NextResponse.json({
      success: true,
      database: 'Teammate Neon Database',
      totalTables: (tables as any[]).length,
      schema: schemaDetails
    });

  } catch (error: any) {
    console.error('Schema analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze database schema',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
