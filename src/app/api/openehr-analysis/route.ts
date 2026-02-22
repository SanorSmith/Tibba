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

    // Check for OpenEHR indicators
    const analysis = {
      isOpenEHR: false,
      evidence: [] as string[],
      tables: [] as string[],
     ehrbaseIntegration: false
    };

    // 1. Check for OpenEHR-specific table names
    const openEHRTables = [
      'ehr', 'composition', 'archetype', 'folder', 'party_identified',
      'participation', 'audit_details', 'object_version_id', 'versioned_object',
      'contribution', 'demographic', 'party', 'actor_role', 'relationship',
      'access_control', 'terminology', 'query', 'stored_query'
    ];

    // Get all tables
    const tables = await teammateDb.execute(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    analysis.tables = (tables as any[]).map((t: any) => t.table_name);

    // 2. Check for OpenEHR table names
    const foundOpenEHRTables = analysis.tables.filter((table: string) => 
      openEHRTables.some(openEHRTable => 
        table.toLowerCase().includes(openEHRTable.toLowerCase())
      )
    );

    if (foundOpenEHRTables.length > 0) {
      analysis.isOpenEHR = true;
      analysis.evidence.push(`Found OpenEHR tables: ${foundOpenEHRTables.join(', ')}`);
    }

    // 3. Check for OpenEHR column patterns
    const openEHRColumns = [
      'ehr_id', 'composition_id', 'archetype_node_id', 'uid',
      'object_version_id', 'preceding_version_uid', 'attestation_ref',
      'lifecycle_state', 'commit_audit', 'contribution', 'feeder_audit',
      'link_uid', 'link_type', 'meaning', 'target', 'nature',
      'party', 'performer', 'function', 'time_validity', 'mode'
    ];

    for (const tableName of analysis.tables) {
      try {
        const columns = await teammateDb.execute(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        `);

        const foundOpenEHRColumns = (columns as any[]).filter(col =>
          openEHRColumns.some(openEHRCol =>
            col.column_name.toLowerCase().includes(openEHRCol.toLowerCase())
          )
        );

        if (foundOpenEHRColumns.length > 0) {
          analysis.isOpenEHR = true;
          analysis.evidence.push(
            `Table "${tableName}" has OpenEHR columns: ${foundOpenEHRColumns.map(c => c.column_name).join(', ')}`
          );
        }
      } catch (error) {
        // Skip tables that can't be accessed
      }
    }

    // 4. Check for EHRbase integration indicators
    const ehrbaseIndicators = [
      'ehrid', 'ehrbase', 'ehr_base', 'openEHR', 'openehr'
    ];

    for (const tableName of analysis.tables) {
      try {
        const columns = await teammateDb.execute(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        `);

        const foundEHRbaseColumns = (columns as any[]).filter(col =>
          ehrbaseIndicators.some(indicator =>
            col.column_name.toLowerCase().includes(indicator.toLowerCase())
          )
        );

        if (foundEHRbaseColumns.length > 0) {
          analysis.ehrbaseIntegration = true;
          analysis.evidence.push(
            `EHRbase integration found in table "${tableName}": ${foundEHRbaseColumns.map(c => c.column_name).join(', ')}`
          );
        }
      } catch (error) {
        // Skip tables that can't be accessed
      }
    }

    // 5. Check for OpenEHR data patterns in sample data
    const openEHRPatterns = [
      /archetype_/i,
      /openEHR-/i,
      /v\d+_\d+/i,  // Version patterns like v1_0
      /uuid/i,
      /composition/i,
      /entry/i,
      /cluster/i,
      /element/i,
      /path_/i,
      /rm_archetype/i
    ];

    // Check sample data from key tables
    const keyTables = ['patients', 'users', 'appointments', 'ehr'];
    for (const tableName of keyTables) {
      if (analysis.tables.includes(tableName)) {
        try {
          const sampleData = await teammateDb.execute(`
            SELECT * FROM "${tableName}" LIMIT 5
          `);

          for (const row of sampleData as any[]) {
            for (const [key, value] of Object.entries(row)) {
              if (typeof value === 'string') {
                for (const pattern of openEHRPatterns) {
                  if (pattern.test(value) || pattern.test(key)) {
                    analysis.isOpenEHR = true;
                    analysis.evidence.push(
                      `OpenEHR pattern found in ${tableName}.${key}: ${value}`
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip if table not accessible
        }
      }
    }

    // 6. Check for custom OpenEHR-like structure
    // Look for JSONB columns that might contain OpenEHR data
    for (const tableName of analysis.tables) {
      try {
        const columns = await teammateDb.execute(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
          AND data_type = 'jsonb'
        `);

        if ((columns as any[]).length > 0) {
          analysis.evidence.push(
            `Table "${tableName}" has JSONB columns: ${(columns as any[]).map(c => c.column_name).join(', ')}`
          );
        }
      } catch (error) {
        // Skip tables that can't be accessed
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      summary: {
        isOpenEHR: analysis.isOpenEHR,
        ehrbaseIntegration: analysis.ehrbaseIntegration,
        evidenceCount: analysis.evidence.length,
        totalTables: analysis.tables.length
      }
    });

  } catch (error: any) {
    console.error('OpenEHR analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze OpenEHR structure',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
