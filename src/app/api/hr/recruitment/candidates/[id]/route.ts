import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Database connection
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = params;

    // For now, return mock candidate data
    // In a real implementation, this would query the database
    const mockCandidate = {
      id: id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+964 770 123 4567',
      position: 'Software Developer',
      department: 'IT',
      status: 'under_review',
      applied_date: '2026-04-15',
      experience: '5 years',
      education: 'Bachelor of Computer Science',
      skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
      notes: 'Strong technical skills, good cultural fit',
      created_at: '2026-04-15T10:00:00Z',
      updated_at: '2026-04-15T10:00:00Z'
    };

    return NextResponse.json({
      success: true,
      data: mockCandidate
    });

  } catch (error) {
    console.error('Error fetching candidate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // For now, just return success with the updated data
    // In a real implementation, this would update the database
    return NextResponse.json({
      success: true,
      data: { ...body, id, updated_at: new Date().toISOString() },
      message: 'Candidate updated successfully'
    });

  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // For now, just return success with the updated data
    // In a real implementation, this would update the database
    return NextResponse.json({
      success: true,
      data: { 
        id, 
        ...body, 
        updated_at: new Date().toISOString() 
      },
      message: 'Candidate updated successfully'
    });

  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = params;

    // For now, just return success
    // In a real implementation, this would delete from the database
    return NextResponse.json({
      success: true,
      message: 'Candidate deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 }
    );
  }
}
