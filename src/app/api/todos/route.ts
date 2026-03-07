import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userid = searchParams.get('userid');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let query = `
      SELECT 
        todoid as "todoId",
        workspaceid as "workspaceId",
        userid as "userId",
        title,
        description,
        completed,
        priority,
        duedate as "dueDate",
        createdat as "createdAt",
        updatedat as "updatedAt"
      FROM todos
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (userid) {
      query += ` AND userid = $${paramIndex}`;
      params.push(userid);
      paramIndex++;
    }

    if (status === 'completed') {
      query += ` AND completed = true`;
    } else if (status === 'pending') {
      query += ` AND completed = false`;
    }

    if (priority && priority !== 'all') {
      query += ` AND priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE 
        WHEN completed = false AND duedate < NOW() THEN 1
        WHEN completed = false THEN 2
        ELSE 3
      END,
      duedate ASC NULLS LAST,
      createdat DESC
    `;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      todos: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch todos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, workspaceId, title, description, priority, dueDate } = body;

    if (!title || !userId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['title', 'userId']
        },
        { status: 400 }
      );
    }

    let finalWorkspaceId = workspaceId;
    
    if (!finalWorkspaceId) {
      const existingWorkspace = await pool.query(`
        SELECT workspaceid FROM workspaces LIMIT 1
      `);
      
      if (existingWorkspace.rows.length > 0) {
        finalWorkspaceId = existingWorkspace.rows[0].workspaceid;
      } else {
        const newWorkspaceId = generateUUID();
        await pool.query(`
          INSERT INTO workspaces (workspaceid, name) VALUES ($1, 'Default Workspace')
        `, [newWorkspaceId]);
        finalWorkspaceId = newWorkspaceId;
      }
    }

    const todoId = generateUUID();

    const result = await pool.query(`
      INSERT INTO todos (
        todoid,
        workspaceid,
        userid,
        title,
        description,
        completed,
        priority,
        duedate,
        createdat,
        updatedat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING 
        todoid as "todoId",
        workspaceid as "workspaceId",
        userid as "userId",
        title,
        description,
        completed,
        priority,
        duedate as "dueDate",
        createdat as "createdAt",
        updatedat as "updatedAt"
    `, [
      todoId,
      finalWorkspaceId,
      userId,
      title,
      description || null,
      false,
      priority || 'medium',
      dueDate || null
    ]);

    return NextResponse.json({
      success: true,
      message: 'Todo created successfully',
      todo: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create todo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { todoId, title, description, completed, priority, dueDate } = body;

    if (!todoId) {
      return NextResponse.json(
        { 
          error: 'Missing todo ID',
          required: ['todoId']
        },
        { status: 400 }
      );
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (completed !== undefined) {
      updateFields.push(`completed = $${paramIndex}`);
      updateValues.push(completed);
      paramIndex++;
    }

    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      updateValues.push(priority);
      paramIndex++;
    }

    if (dueDate !== undefined) {
      updateFields.push(`duedate = $${paramIndex}`);
      updateValues.push(dueDate);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { 
          error: 'No fields to update',
          details: 'At least one field must be provided for update'
        },
        { status: 400 }
      );
    }

    updateFields.push(`updatedat = NOW()`);
    updateValues.push(todoId);

    const query = `
      UPDATE todos 
      SET ${updateFields.join(', ')}
      WHERE todoid = $${paramIndex}
      RETURNING 
        todoid as "todoId",
        workspaceid as "workspaceId",
        userid as "userId",
        title,
        description,
        completed,
        priority,
        duedate as "dueDate",
        createdat as "createdAt",
        updatedat as "updatedAt"
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Todo not found',
          details: `No todo found with ID: ${todoId}`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Todo updated successfully',
      todo: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update todo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const todoId = searchParams.get('todoId');

    if (!todoId) {
      return NextResponse.json(
        { 
          error: 'Missing todo ID',
          required: ['todoId']
        },
        { status: 400 }
      );
    }

    const existingTodo = await pool.query(
      'SELECT * FROM todos WHERE todoid = $1',
      [todoId]
    );

    if (existingTodo.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Todo not found',
          details: `No todo found with ID: ${todoId}`
        },
        { status: 404 }
      );
    }

    await pool.query(
      'DELETE FROM todos WHERE todoid = $1',
      [todoId]
    );

    return NextResponse.json({
      success: true,
      message: 'Todo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete todo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
