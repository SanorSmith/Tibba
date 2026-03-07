import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== FIX SPECIALTIES ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    // Get current departments
    const departmentsResult = await pool.query('SELECT departmentid, name FROM departments ORDER BY name');
    console.log('Departments:', departmentsResult.rows);

    // Get current specialties
    const specialtiesResult = await pool.query('SELECT specialtyid, name, departmentid FROM specialties');
    console.log('Specialties before fix:', specialtiesResult.rows);

    // Create a mapping of department names to new IDs
    const deptMap = new Map();
    departmentsResult.rows.forEach(dept => {
      deptMap.set(dept.name.toLowerCase(), dept.departmentid);
    });

    // Update specialties to match departments by name
    const specialtyDeptMapping = {
      'cardiology': 'Cardiology',
      'neurology': 'Neurology', 
      'pediatrics': 'Pediatrics',
      'emergency': 'Emergency',
      'surgery': 'Surgery',
      'radiology': 'Radiology'
    };

    let updatedCount = 0;
    
    for (const specialty of specialtiesResult.rows) {
      const specialtyNameLower = specialty.name.toLowerCase();
      
      // Find matching department name
      let matchingDeptName = null;
      for (const [key, value] of Object.entries(specialtyDeptMapping)) {
        if (specialtyNameLower.includes(key)) {
          matchingDeptName = value;
          break;
        }
      }
      
      if (matchingDeptName) {
        const newDeptId = deptMap.get(matchingDeptName.toLowerCase());
        if (newDeptId && newDeptId !== specialty.departmentid) {
          console.log(`Updating ${specialty.name}: old dept ${specialty.departmentid} -> new dept ${newDeptId}`);
          
          await pool.query(
            'UPDATE specialties SET departmentid = $1 WHERE specialtyid = $2',
            [newDeptId, specialty.specialtyid]
          );
          updatedCount++;
        }
      }
    }

    // Verify the fix
    const updatedSpecialties = await pool.query(`
      SELECT s.name, s.departmentid, d.name as dept_name 
      FROM specialties s 
      LEFT JOIN departments d ON s.departmentid = d.departmentid 
      ORDER BY s.name
    `);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Specialties department references fixed',
      departments: departmentsResult.rows.length,
      specialties: specialtiesResult.rows.length,
      updated: updatedCount,
      mapping: updatedSpecialties.rows
    });

  } catch (error) {
    console.error('FIX SPECIALTIES ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fix specialties',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
