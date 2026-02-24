const express = require('express');
const postgres = require('postgres');
const path = require('path');

const app = express();
const PORT = 3002;

// Database connection (same as web app should use)
const DATABASE_URL = 'postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Database connection
let sql;

async function initDatabase() {
  try {
    sql = postgres(DATABASE_URL, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
    console.log('✅ Connected to database');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// API Routes
app.get('/api/database-info', async (req, res) => {
  try {
    const info = await sql`
      SELECT 
        current_database() as database,
        current_schema() as schema,
        version() as version,
        inet_server_addr() as server_ip
    `;
    res.json(info[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tables', async (req, res) => {
  try {
    const tables = await sql`
      SELECT 
        table_name,
        table_schema,
        table_type
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name
    `;
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/table/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/table/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // First get count
    const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
    const total = countResult[0].count;
    
    // Get data
    const data = await sql`
      SELECT * FROM ${sql(tableName)} 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    res.json({
      data,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/table/:tableName/count', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
    res.json({ count: result[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { query = '', limit = 50 } = req.query;
    
    if (!query) {
      return res.json({ data: [] });
    }
    
    // Get column names first
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      AND data_type IN ('text', 'varchar', 'char', 'integer', 'bigint', 'numeric')
    `;
    
    if (columns.length === 0) {
      return res.json({ data: [] });
    }
    
    // Build search query
    const searchConditions = columns.map(col => 
      sql`${sql(col.column_name)} ILIKE ${`%${query}%`}`
    );
    
    const data = await sql`
      SELECT * FROM ${sql(tableName)} 
      WHERE ${sql.unsafe(searchConditions.join(' OR '))}
      LIMIT ${limit}
    `;
    
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Database Explorer running at http://localhost:${PORT}`);
    console.log(`📊 Exploring database: ${DATABASE_URL}`);
    console.log(`🔗 Web App: https://app.tibbna.com/d/fa9fb036-a7eb-49af-890c-54406dad139d/dashboard`);
  });
});
