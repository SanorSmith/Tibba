import { teammateDb } from './supabase/teammate';

// Example functions to access your teammate's database

// 1. Get all patients
export async function getTeammatePatients() {
  try {
    if (!teammateDb) {
      console.error('Teammate database not connected');
      return [];
    }
    
    const patients = await teammateDb.execute('SELECT * FROM patients LIMIT 10');
    return patients;
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

// 2. Get all appointments
export async function getTeammateAppointments() {
  try {
    if (!teammateDb) {
      console.error('Teammate database not connected');
      return [];
    }
    
    const appointments = await teammateDb.execute('SELECT * FROM appointments LIMIT 10');
    return appointments;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

// 3. Get staff members
export async function getTeammateStaff() {
  try {
    if (!teammateDb) {
      console.error('Teammate database not connected');
      return [];
    }
    
    const staff = await teammateDb.execute('SELECT * FROM staff LIMIT 10');
    return staff;
  } catch (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
}

// 4. Get workspaces
export async function getTeammateWorkspaces() {
  try {
    if (!teammateDb) {
      console.error('Teammate database not connected');
      return [];
    }
    
    const workspaces = await teammateDb.execute('SELECT * FROM workspaces LIMIT 10');
    return workspaces;
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }
}

// 5. Custom query example
export async function searchPatients(searchTerm: string) {
  try {
    if (!teammateDb) {
      console.error('Teammate database not connected');
      return [];
    }
    
    const patients = await teammateDb.execute(`
      SELECT * FROM patients 
      WHERE firstname ILIKE '%${searchTerm}%' 
      OR lastname ILIKE '%${searchTerm}%'
      LIMIT 5
    `);
    return patients;
  } catch (error) {
    console.error('Error searching patients:', error);
    return [];
  }
}

// 6. Get appointments for today
export async function getTodayAppointments() {
  try {
    if (!teammateDb) {
      console.error('Teammate database not connected');
      return [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    const appointments = await teammateDb.execute(`
      SELECT * FROM appointments 
      WHERE DATE(createdat) = '${today}'
      ORDER BY createdat DESC
    `);
    return appointments;
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    return [];
  }
}
