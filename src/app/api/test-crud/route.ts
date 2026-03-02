/**
 * Test CRUD Operations for Departments
 * GET /api/test-crud - Test all CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Neon database connection
const pool = new Pool({
  connectionString: process.env.OPENEHR_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENEHR_DATABASE_URL) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Testing CRUD operations...');

    const results = {
      database_connection: false,
      table_exists: false,
      read_operation: false,
      create_operation: false,
      update_operation: false,
      delete_operation: false,
      departments_count: 0,
      test_department_id: null as string | null,
      errors: [] as string[]
    };

    // Test 1: Database Connection
    try {
      await pool.query('SELECT NOW()');
      results.database_connection = true;
    } catch (error) {
      results.errors.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 2: Table Exists
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'departments'
        ) as exists
      `);
      results.table_exists = tableCheck.rows[0].exists;
    } catch (error) {
      results.errors.push(`Table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!results.table_exists) {
      return NextResponse.json({
        success: false,
        message: 'Departments table does not exist',
        results,
        instructions: [
          '1. Create departments table in your Neon database',
          '2. Use the existing table structure with fields: departmentid, name, email, phone, address, createdat, updatedat'
        ]
      });
    }

    // Test 3: Read Operation
    try {
      const readResult = await pool.query(
        'SELECT departmentid, name, email, phone, address FROM departments ORDER BY name ASC'
      );
      results.read_operation = true;
      results.departments_count = readResult.rows.length;
    } catch (error) {
      results.errors.push(`Read operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 4: Create Operation
    let testDepartmentId = null;
    try {
      const createResult = await pool.query(
        `INSERT INTO departments (name, email, phone, address, createdat, updatedat)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING departmentid`,
        ['Test Department', 'test@example.com', '+1234567890', 'Test Location']
      );
      testDepartmentId = createResult.rows[0].departmentid;
      results.test_department_id = testDepartmentId;
      results.create_operation = true;
    } catch (error) {
      results.errors.push(`Create operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 5: Update Operation
    if (testDepartmentId) {
      try {
        await pool.query(
          `UPDATE departments 
           SET name = $1, email = $2, updatedat = NOW()
           WHERE departmentid = $3`,
          ['Updated Test Department', 'updated@example.com', testDepartmentId]
        );
        results.update_operation = true;
      } catch (error) {
        results.errors.push(`Update operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 6: Delete Operation
    if (testDepartmentId) {
      try {
        await pool.query('DELETE FROM departments WHERE departmentid = $1', [testDepartmentId]);
        results.delete_operation = true;
      } catch (error) {
        results.errors.push(`Delete operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Final Status
    const allOperationsWorking = results.database_connection && 
                              results.table_exists && 
                              results.read_operation && 
                              results.create_operation && 
                              results.update_operation && 
                              results.delete_operation;

    return NextResponse.json({
      success: allOperationsWorking,
      message: allOperationsWorking 
        ? 'All CRUD operations are working correctly!' 
        : 'Some CRUD operations failed',
      results,
      summary: {
        database_connection: results.database_connection ? '✅ Connected' : '❌ Failed',
        table_exists: results.table_exists ? '✅ Exists' : '❌ Missing',
        read_operation: results.read_operation ? '✅ Working' : '❌ Failed',
        create_operation: results.create_operation ? '✅ Working' : '❌ Failed',
        update_operation: results.update_operation ? '✅ Working' : '❌ Failed',
        delete_operation: results.delete_operation ? '✅ Working' : '❌ Failed',
        total_departments: results.departments_count
      }
    });

  } catch (error) {
    console.error('CRUD test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'CRUD test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
