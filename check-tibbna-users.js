// Script to check users in the Tibbna disconnect system
const { Pool } = require('pg');

// Database connection configuration
const config = {
  host: 'ep-blue-wood-831336.us-east-1.postgres.amplifydb.com',
  port: 5432,
  database: 'tibbna_preview',
  user: 'tibbna_preview_owner',
  password: 'EPpY3XlP8sOQ',
  ssl: { rejectUnauthorized: false }
};

async function checkUsers() {
  const pool = new Pool(config);
  
  try {
    console.log('🔍 Connecting to Tibbna Preview Database...\n');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');
    
    // Check users table structure
    console.log('📋 Users Table Structure:');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    tableInfo.rows.forEach(col => {
      console.log(`  • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });
    
    // Count total users
    const totalUsers = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Total Users: ${totalUsers.rows[0].count}`);
    
    // Get user statistics by permissions
    const userStats = await client.query(`
      SELECT 
        permissions,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
      FROM users 
      GROUP BY permissions 
      ORDER BY count DESC
    `);
    
    console.log('\n👥 Users by Permission Type:');
    userStats.rows.forEach(stat => {
      const permission = stat.permissions || 'NULL';
      const percentage = stat.percentage ? stat.percentage.toFixed(1) : '0.0';
      console.log(`  • ${permission}: ${stat.count} users (${percentage}%)`);
    });
    
    // Get sample users with details
    const sampleUsers = await client.query(`
      SELECT 
        userid,
        name,
        email,
        permissions,
        theme,
        language,
        createdat,
        updatedat
      FROM users 
      ORDER BY createdat DESC 
      LIMIT 10
    `);
    
    console.log('\n🔍 Sample Users (Latest 10):');
    sampleUsers.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'No Name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.userid}`);
      console.log(`   Permissions: ${user.permissions || 'NULL'}`);
      console.log(`   Theme: ${user.theme}`);
      console.log(`   Language: ${user.language}`);
      console.log(`   Created: ${user.createdat}`);
      console.log(`   Updated: ${user.updatedat}`);
    });
    
    // Check for admin users specifically
    const adminUsers = await client.query(`
      SELECT userid, name, email, permissions, createdat
      FROM users 
      WHERE permissions ? 'admin'
    `);
    
    console.log(`\n🔐 Admin Users: ${adminUsers.rows.length}`);
    adminUsers.rows.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.name || 'No Name'}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   User ID: ${admin.userid}`);
      console.log(`   Permissions: ${JSON.stringify(admin.permissions)}`);
      console.log(`   Created: ${admin.createdat}`);
    });
    
    // Check user sessions
    const sessionCount = await client.query('SELECT COUNT(*) as count FROM usersessions');
    const activeSessions = await client.query(`
      SELECT COUNT(*) as count 
      FROM usersessions 
      WHERE expiresat > NOW()
    `);
    
    console.log(`\n🔑 User Sessions:`);
    console.log(`  • Total Sessions: ${sessionCount.rows[0].count}`);
    console.log(`  • Active Sessions: ${activeSessions.rows[0].count}`);
    
    // Get recent sessions
    const recentSessions = await client.query(`
      SELECT 
        us.sessionid,
        us.userid,
        u.name,
        u.email,
        us.deviceinfo,
        us.ipaddress,
        us.createdat,
        us.lastactive,
        us.expiresat
      FROM usersessions us
      JOIN users u ON us.userid = u.userid
      ORDER BY us.lastactive DESC
      LIMIT 5
    `);
    
    console.log('\n🔑 Recent User Sessions:');
    recentSessions.rows.forEach((session, index) => {
      console.log(`\n${index + 1}. ${session.name || 'Unknown User'}`);
      console.log(`   Email: ${session.email}`);
      console.log(`   Device: ${session.deviceinfo || 'Unknown'}`);
      console.log(`   IP: ${session.ipaddress || 'Unknown'}`);
      console.log(`   Last Active: ${session.lastactive}`);
      console.log(`   Expires: ${session.expiresat}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
