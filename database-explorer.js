const express = require('express');
const postgres = require('postgres');
const path = require('path');

const app = express();
const PORT = 3001;

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

// Main HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Explorer - Tibbna Web App Database</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; font-size: 0.9rem; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .db-info { background: white; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .db-info h2 { color: #333; margin-bottom: 0.5rem; }
        .db-info p { color: #666; margin: 0.25rem 0; }
        .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .table-card { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .table-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .table-card h3 { color: #333; margin-bottom: 0.5rem; }
        .table-card p { color: #666; font-size: 0.9rem; }
        .table-detail { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 2rem; }
        .table-detail h2 { color: #333; margin-bottom: 1rem; }
        .search-box { margin-bottom: 1rem; }
        .search-box input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
        .table-data { overflow-x: auto; }
        .table-data table { width: 100%; border-collapse: collapse; }
        .table-data th, .table-data td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
        .table-data th { background: #f8f9fa; font-weight: 600; color: #333; }
        .table-data tr:hover { background: #f8f9fa; }
        .pagination { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
        .pagination button { padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
        .pagination button:hover { background: #f8f9fa; }
        .pagination button.active { background: #667eea; color: white; border-color: #667eea; }
        .loading { text-align: center; padding: 2rem; color: #666; }
        .error { background: #fee; color: #c33; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
        .back-btn { background: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }
        .back-btn:hover { background: #5a6fd8; }
        .structure-info { background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
        .structure-info h4 { color: #333; margin-bottom: 0.5rem; }
        .structure-info ul { list-style: none; padding: 0; }
        .structure-info li { color: #666; margin: 0.25rem 0; font-family: monospace; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Database Explorer</h1>
        <p>Exploring Tibbna Web App Database - https://app.tibbna.com/d/fa9fb036-a7eb-49af-890c-54406dad139d/dashboard</p>
    </div>

    <div class="container">
        <div id="dbInfo" class="db-info">
            <h2>Database Information</h2>
            <div id="dbDetails">Loading...</div>
        </div>

        <div id="content">
            <div class="loading">Loading database tables...</div>
        </div>
    </div>

    <script>
        let currentTable = null;
        let currentPage = 0;
        const pageSize = 50;

        async function loadDatabaseInfo() {
            try {
                const response = await fetch('/api/database-info');
                const info = await response.json();
                document.getElementById('dbDetails').innerHTML = \`
                    <p><strong>Database:</strong> \${info.database}</p>
                    <p><strong>Schema:</strong> \${info.schema}</p>
                    <p><strong>Version:</strong> \${info.version}</p>
                    <p><strong>Server IP:</strong> \${info.server_ip || 'N/A'}</p>
                \`;
            } catch (error) {
                document.getElementById('dbDetails').innerHTML = '<div class="error">Error loading database info: ' + error.message + '</div>';
            }
        }

        async function loadTables() {
            try {
                const response = await fetch('/api/tables');
                const tables = await response.json();
                
                const content = document.getElementById('content');
                content.innerHTML = '<h2>📊 Database Tables</h2><div class="tables-grid" id="tablesGrid"></div>';
                
                const grid = document.getElementById('tablesGrid');
                
                for (const table of tables) {
                    const countResponse = await fetch(\`/api/table/\${table.table_name}/count\`);
                    const countData = await countResponse.json();
                    
                    const card = document.createElement('div');
                    card.className = 'table-card';
                    card.innerHTML = \`
                        <h3>\${table.table_name}</h3>
                        <p><strong>Schema:</strong> \${table.table_schema}</p>
                        <p><strong>Type:</strong> \${table.table_type}</p>
                        <p><strong>Records:</strong> \${countData.count}</p>
                    \`;
                    card.onclick = () => loadTable(table.table_name);
                    grid.appendChild(card);
                }
            } catch (error) {
                document.getElementById('content').innerHTML = '<div class="error">Error loading tables: ' + error.message + '</div>';
            }
        }

        async function loadTable(tableName) {
            currentTable = tableName;
            currentPage = 0;
            
            try {
                const [structureResponse, dataResponse] = await Promise.all([
                    fetch(\`/api/table/\${tableName}/structure\`),
                    fetch(\`/api/table/\${tableName}/data?limit=\${pageSize}&offset=0\`)
                ]);
                
                const structure = await structureResponse.json();
                const data = await dataResponse.json();
                
                const content = document.getElementById('content');
                content.innerHTML = \`
                    <button class="back-btn" onclick="loadTables()">← Back to Tables</button>
                    <div class="table-detail">
                        <h2>📋 Table: \${tableName}</h2>
                        <div class="structure-info">
                            <h4>Table Structure:</h4>
                            <ul>
                                \${structure.map(col => \`
                                    <li>\${col.column_name}: \${col.data_type}\${col.is_nullable === 'NO' ? ' NOT NULL' : ''}\${col.column_default ? \` DEFAULT \${col.column_default}\` : ''}</li>
                                \`).join('')}
                            </ul>
                        </div>
                        <div class="search-box">
                            <input type="text" placeholder="Search in \${tableName}..." onkeyup="searchTable(this.value)">
                        </div>
                        <div class="table-data">
                            <table>
                                <thead>
                                    <tr>
                                        \${structure.map(col => \`<th>\${col.column_name}</th>\`).join('')}
                                    </tr>
                                </thead>
                                <tbody id="tableBody">
                                    \${data.data.map(row => \`
                                        <tr>
                                            \${structure.map(col => \`<td>\${row[col.column_name] || ''}</td>\`).join('')}
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="pagination" id="pagination"></div>
                        <p style="margin-top: 1rem; color: #666;">Showing \${data.data.length} of \${data.total} records</p>
                    </div>
                \`;
                
                renderPagination(data.total);
            } catch (error) {
                document.getElementById('content').innerHTML = '<div class="error">Error loading table: ' + error.message + '</div>';
            }
        }

        async function searchTable(query) {
            if (!currentTable) return;
            
            try {
                const response = await fetch(\`/api/search/\${currentTable}?query=\${encodeURIComponent(query)}&limit=\${pageSize}\`);
                const data = await response.json();
                
                const tbody = document.getElementById('tableBody');
                if (data.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 2rem; color: #666;">No results found</td></tr>';
                } else {
                    tbody.innerHTML = data.data.map(row => \`
                        <tr>
                            \${Array.from(tbody.previousElementSibling.rows[0].cells).map((cell, i) => \`
                                <td>\${row[cell.textContent] || ''}</td>
                            \`).join('')}
                        </tr>
                    \`).join('');
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }

        async function renderPagination(total) {
            const totalPages = Math.ceil(total / pageSize);
            const pagination = document.getElementById('pagination');
            
            let html = '';
            for (let i = 0; i < Math.min(totalPages, 10); i++) {
                html += \`<button onclick="loadPage(\${i})" class="\${i === currentPage ? 'active' : ''}">\${i + 1}</button>\`;
            }
            
            pagination.innerHTML = html;
        }

        async function loadPage(page) {
            currentPage = page;
            
            try {
                const response = await fetch(\`/api/table/\${currentTable}/data?limit=\${pageSize}&offset=\${page * pageSize}\`);
                const data = await response.json();
                
                const tbody = document.getElementById('tableBody');
                tbody.innerHTML = data.data.map(row => \`
                    <tr>
                        \${Array.from(tbody.previousElementSibling.rows[0].cells).map((cell, i) => \`
                            <td>\${row[cell.textContent] || ''}</td>
                        \`).join('')}
                    </tr>
                \`).join('');
                
                renderPagination(data.total);
            } catch (error) {
                console.error('Pagination error:', error);
            }
        }

        // Initialize
        loadDatabaseInfo();
        loadTables();
    </script>
</body>
</html>
  `);
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(\`🚀 Database Explorer running at http://localhost:\${PORT}\`);
    console.log(\`📊 Exploring database: \${DATABASE_URL}\`);
    console.log(\`🔗 Web App: https://app.tibbna.com/d/fa9fb036-a7eb-49af-890c-54406dad139d/dashboard\`);
  });
});
