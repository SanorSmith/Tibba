/**
 * Restore HR Demo Data
 * Restores departments, staff, patients, appointments, and todos
 */

require('dotenv').config({ path: '.env.local' });

const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || process.env.TIBBNA_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function restoreHRData() {
  console.log('🔧 Restoring HR Demo Data...\n');

  try {
    // Get workspace and user IDs for associations
    const workspaces = await sql`SELECT workspaceid FROM workspaces LIMIT 1`;
    const users = await sql`SELECT userid FROM users LIMIT 1`;
    
    if (workspaces.length === 0 || users.length === 0) {
      throw new Error('No workspaces or users found. Run restore-auth-data.js first.');
    }

    const workspaceId = workspaces[0].workspaceid;
    const userId = users[0].userid;

    // 1. Restore Departments
    console.log('🏢 Restoring departments...');
    const departments = [
      { name: 'Emergency Department', phone: '+964-770-123-4567', email: 'emergency@tibbna.com', address: 'Building A, Floor 1' },
      { name: 'Cardiology', phone: '+964-770-123-4568', email: 'cardiology@tibbna.com', address: 'Building B, Floor 3' },
      { name: 'Pediatrics', phone: '+964-770-123-4569', email: 'pediatrics@tibbna.com', address: 'Building C, Floor 2' },
      { name: 'Radiology', phone: '+964-770-123-4570', email: 'radiology@tibbna.com', address: 'Building D, Floor 1' },
      { name: 'Laboratory', phone: '+964-770-123-4571', email: 'lab@tibbna.com', address: 'Building E, Floor 1' },
      { name: 'Surgery', phone: '+964-770-123-4572', email: 'surgery@tibbna.com', address: 'Building F, Floor 4' },
      { name: 'Pharmacy', phone: '+964-770-123-4573', email: 'pharmacy@tibbna.com', address: 'Building G, Floor 1' },
    ];

    const insertedDepartments = [];
    for (const dept of departments) {
      const result = await sql`
        INSERT INTO departments (departmentid, workspaceid, name, phone, email, address, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${dept.name},
          ${dept.phone},
          ${dept.email},
          ${dept.address},
          NOW(),
          NOW()
        )
        RETURNING departmentid, name
      `;
      insertedDepartments.push(result[0]);
      console.log(`✅ Department: ${result[0].name}`);
    }

    // 2. Restore Staff
    console.log('\n👥 Restoring staff members...');
    const staff = [
      { role: 'Doctor', firstname: 'Ahmed', lastname: 'Al-Rashid', specialty: 'Cardiology', unit: 'Cardiology', phone: '+964-770-234-5678', email: 'ahmed.rashid@tibbna.com' },
      { role: 'Doctor', firstname: 'Fatima', lastname: 'Hassan', specialty: 'Pediatrics', unit: 'Pediatrics', phone: '+964-770-234-5679', email: 'fatima.hassan@tibbna.com' },
      { role: 'Nurse', firstname: 'Sara', lastname: 'Mohammed', specialty: 'Emergency Care', unit: 'Emergency', phone: '+964-770-234-5680', email: 'sara.mohammed@tibbna.com' },
      { role: 'Nurse', firstname: 'Ali', lastname: 'Karim', specialty: 'Surgery', unit: 'Surgery', phone: '+964-770-234-5681', email: 'ali.karim@tibbna.com' },
      { role: 'Technician', firstname: 'Layla', lastname: 'Ibrahim', specialty: 'Radiology', unit: 'Radiology', phone: '+964-770-234-5682', email: 'layla.ibrahim@tibbna.com' },
      { role: 'Technician', firstname: 'Omar', lastname: 'Saleh', specialty: 'Laboratory', unit: 'Laboratory', phone: '+964-770-234-5683', email: 'omar.saleh@tibbna.com' },
      { role: 'Pharmacist', firstname: 'Zainab', lastname: 'Ali', specialty: 'Clinical Pharmacy', unit: 'Pharmacy', phone: '+964-770-234-5684', email: 'zainab.ali@tibbna.com' },
      { role: 'Administrator', firstname: 'Hassan', lastname: 'Mahmoud', specialty: 'HR Management', unit: 'Administration', phone: '+964-770-234-5685', email: 'hassan.mahmoud@tibbna.com' },
      { role: 'Receptionist', firstname: 'Maryam', lastname: 'Youssef', specialty: 'Patient Services', unit: 'Reception', phone: '+964-770-234-5686', email: 'maryam.youssef@tibbna.com' },
    ];

    const insertedStaff = [];
    for (const member of staff) {
      const result = await sql`
        INSERT INTO staff (staffid, workspaceid, role, firstname, middlename, lastname, unit, specialty, phone, email, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${member.role},
          ${member.firstname},
          NULL,
          ${member.lastname},
          ${member.unit},
          ${member.specialty},
          ${member.phone},
          ${member.email},
          NOW(),
          NOW()
        )
        RETURNING staffid, firstname, lastname, role
      `;
      insertedStaff.push(result[0]);
      console.log(`✅ Staff: ${result[0].firstname} ${result[0].lastname} (${result[0].role})`);
    }

    // 3. Restore Patients
    console.log('\n🏥 Restoring patients...');
    const patients = [
      { firstname: 'Mohammed', lastname: 'Abdullah', nationalid: 'IQ-001-2345678', dateofbirth: '1985-03-15', phone: '+964-770-345-6789', email: 'mohammed.abdullah@email.com', gender: 'Male', bloodgroup: 'O+' },
      { firstname: 'Aisha', lastname: 'Rahman', nationalid: 'IQ-002-2345679', dateofbirth: '1990-07-22', phone: '+964-770-345-6790', email: 'aisha.rahman@email.com', gender: 'Female', bloodgroup: 'A+' },
      { firstname: 'Khalid', lastname: 'Hussain', nationalid: 'IQ-003-2345680', dateofbirth: '1978-11-30', phone: '+964-770-345-6791', email: 'khalid.hussain@email.com', gender: 'Male', bloodgroup: 'B+' },
      { firstname: 'Noor', lastname: 'Salim', nationalid: 'IQ-004-2345681', dateofbirth: '1995-05-18', phone: '+964-770-345-6792', email: 'noor.salim@email.com', gender: 'Female', bloodgroup: 'AB+' },
      { firstname: 'Youssef', lastname: 'Tariq', nationalid: 'IQ-005-2345682', dateofbirth: '1982-09-25', phone: '+964-770-345-6793', email: 'youssef.tariq@email.com', gender: 'Male', bloodgroup: 'O-' },
    ];

    const insertedPatients = [];
    for (const patient of patients) {
      const result = await sql`
        INSERT INTO patients (patientid, workspaceid, firstname, middlename, lastname, nationalid, dateofbirth, phone, email, address, gender, bloodgroup, medicalhistory, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${patient.firstname},
          NULL,
          ${patient.lastname},
          ${patient.nationalid},
          ${patient.dateofbirth},
          ${patient.phone},
          ${patient.email},
          'Baghdad, Iraq',
          ${patient.gender},
          ${patient.bloodgroup},
          '{}'::jsonb,
          NOW(),
          NOW()
        )
        RETURNING patientid, firstname, lastname
      `;
      insertedPatients.push(result[0]);
      console.log(`✅ Patient: ${result[0].firstname} ${result[0].lastname}`);
    }

    // Add more patients (to reach ~64 total)
    console.log('   Adding additional patients...');
    for (let i = 6; i <= 64; i++) {
      const genders = ['Male', 'Female'];
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      const gender = genders[i % 2];
      const bloodGroup = bloodGroups[i % 8];
      
      await sql`
        INSERT INTO patients (patientid, workspaceid, firstname, middlename, lastname, nationalid, dateofbirth, phone, email, address, gender, bloodgroup, medicalhistory, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${`Patient${i}`},
          NULL,
          ${`LastName${i}`},
          ${`IQ-${String(i).padStart(3, '0')}-${2345678 + i}`},
          ${`${1950 + (i % 50)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`},
          ${`+964-770-${String(345678 + i).padStart(7, '0')}`},
          ${`patient${i}@email.com`},
          'Baghdad, Iraq',
          ${gender},
          ${bloodGroup},
          '{}'::jsonb,
          NOW(),
          NOW()
        )
      `;
    }
    console.log(`✅ Added 59 additional patients (total: 64)`);

    // 4. Restore Appointments
    console.log('\n📅 Restoring appointments...');
    if (insertedPatients.length > 0 && insertedStaff.length > 0) {
      const appointments = [
        { patientIdx: 0, staffIdx: 0, starttime: '2026-03-01 09:00:00+00', endtime: '2026-03-01 09:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
        { patientIdx: 1, staffIdx: 1, starttime: '2026-03-01 10:00:00+00', endtime: '2026-03-01 10:30:00+00', location: 'Room 201', status: 'scheduled', unit: 'Pediatrics' },
        { patientIdx: 2, staffIdx: 0, starttime: '2026-03-01 11:00:00+00', endtime: '2026-03-01 11:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
        { patientIdx: 3, staffIdx: 1, starttime: '2026-03-01 14:00:00+00', endtime: '2026-03-01 14:30:00+00', location: 'Room 201', status: 'confirmed', unit: 'Pediatrics' },
        { patientIdx: 4, staffIdx: 2, starttime: '2026-03-01 15:00:00+00', endtime: '2026-03-01 15:30:00+00', location: 'Emergency Room 1', status: 'confirmed', unit: 'Emergency' },
        { patientIdx: 0, staffIdx: 0, starttime: '2026-03-02 09:00:00+00', endtime: '2026-03-02 09:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
        { patientIdx: 1, staffIdx: 1, starttime: '2026-03-02 10:00:00+00', endtime: '2026-03-02 10:30:00+00', location: 'Room 201', status: 'scheduled', unit: 'Pediatrics' },
        { patientIdx: 2, staffIdx: 4, starttime: '2026-03-02 11:00:00+00', endtime: '2026-03-02 11:30:00+00', location: 'Radiology Suite', status: 'scheduled', unit: 'Radiology' },
        { patientIdx: 3, staffIdx: 5, starttime: '2026-03-02 14:00:00+00', endtime: '2026-03-02 14:30:00+00', location: 'Lab Room 3', status: 'completed', unit: 'Laboratory' },
        { patientIdx: 4, staffIdx: 3, starttime: '2026-03-03 08:00:00+00', endtime: '2026-03-03 10:00:00+00', location: 'Operating Room 2', status: 'scheduled', unit: 'Surgery' },
        { patientIdx: 0, staffIdx: 6, starttime: '2026-03-03 13:00:00+00', endtime: '2026-03-03 13:15:00+00', location: 'Pharmacy Counter', status: 'completed', unit: 'Pharmacy' },
        { patientIdx: 1, staffIdx: 0, starttime: '2026-03-04 09:00:00+00', endtime: '2026-03-04 09:30:00+00', location: 'Room 101', status: 'scheduled', unit: 'Cardiology' },
        { patientIdx: 2, staffIdx: 1, starttime: '2026-03-04 10:00:00+00', endtime: '2026-03-04 10:30:00+00', location: 'Room 201', status: 'cancelled', unit: 'Pediatrics' },
      ];

      for (const appt of appointments) {
        const patient = insertedPatients[appt.patientIdx];
        const doctor = insertedStaff[appt.staffIdx];
        
        await sql`
          INSERT INTO appointments (appointmentid, workspaceid, patientid, doctorid, starttime, endtime, location, status, unit, notes, createdat, updatedat)
          VALUES (
            gen_random_uuid(),
            ${workspaceId},
            ${patient.patientid},
            ${doctor.staffid},
            ${appt.starttime},
            ${appt.endtime},
            ${appt.location},
            ${appt.status}::appointment_status,
            ${appt.unit},
            '{}'::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
      console.log(`✅ Restored ${appointments.length} appointments`);
    }

    // 5. Restore Todos
    console.log('\n📝 Restoring todos...');
    const todos = [
      { title: 'Review patient records', description: 'Review and update patient medical records', priority: 'high', duedate: '2026-03-05', completed: false },
      { title: 'Schedule staff meeting', description: 'Organize monthly department meeting', priority: 'medium', duedate: '2026-03-10', completed: false },
      { title: 'Order medical supplies', description: 'Restock emergency department supplies', priority: 'high', duedate: '2026-03-03', completed: true },
      { title: 'Update equipment maintenance log', description: 'Log recent equipment maintenance activities', priority: 'low', duedate: '2026-03-15', completed: false },
      { title: 'Prepare monthly report', description: 'Compile statistics and prepare monthly report', priority: 'medium', duedate: '2026-03-31', completed: false },
      { title: 'Training session preparation', description: 'Prepare materials for staff training', priority: 'medium', duedate: '2026-03-20', completed: false },
    ];

    for (const todo of todos) {
      await sql`
        INSERT INTO todos (todoid, workspaceid, userid, title, description, completed, priority, duedate, createdat, updatedat)
        VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${userId},
          ${todo.title},
          ${todo.description},
          ${todo.completed},
          ${todo.priority},
          ${todo.duedate},
          NOW(),
          NOW()
        )
      `;
    }
    console.log(`✅ Restored ${todos.length} todos`);

    // Summary
    console.log('\n📋 HR Data Restoration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Departments: ${insertedDepartments.length}`);
    console.log(`✅ Staff members: ${insertedStaff.length}`);
    console.log(`✅ Patients: 64`);
    console.log(`✅ Appointments: 13`);
    console.log(`✅ Todos: ${todos.length}`);
    console.log('='.repeat(60));

    console.log('\n🎉 HR Demo Data restored successfully!');

  } catch (error) {
    console.error('❌ Error restoring HR data:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run
restoreHRData().catch(console.error);
