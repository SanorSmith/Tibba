import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

export async function POST(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password, username } = body;

    // Accept either email or username
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['email or username', 'password']
        },
        { status: 400 }
      );
    }

    console.log('Login attempt for:', loginIdentifier);

    // Look up real user in DB
    const lookupEmail = loginIdentifier.includes('@')
      ? loginIdentifier
      : `${loginIdentifier}@hospital.com`;

    let dbUser: any = null;
    try {
      const r = await pool.query(
        'SELECT userid, name, email FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($2) LIMIT 1',
        [lookupEmail, loginIdentifier]
      );
      if (r.rows.length > 0) dbUser = r.rows[0];
    } catch (e) {
      console.warn('User DB lookup failed, falling back to mock:', e);
    }

    // ── Resolve the facility (workspace) this user actually belongs to ────────
    // Real accounts get their facility + role from `workspaceusers`, the same
    // source of truth the wider Tibbna platform uses — so a nurse at "Alis"
    // lands in Alis as a nurse, not in a hardcoded hospital as a super admin.
    //
    // The demo logins (superadmin/finance/hr/inventory/reception) have no row
    // in `users` at all, so they fall back to the legacy behaviour below.
    // Removing that fallback would lock every demo account out of the ERP.
    const FALLBACK_WORKSPACE_ID = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd'; // Hospital 1
    let membership: { workspaceid: string; workspace_name: string; ws_role: string } | null = null;
    if (dbUser?.userid) {
      try {
        // Selection rule when a user belongs to several facilities: this app is
        // the hospital ERP, so prefer a hospital, then the earliest-created one.
        // Oldest-first keeps existing staff in the facility they've always used
        // rather than bouncing them to whichever facility was created most
        // recently (the platform's own default, which is arbitrary here).
        const m = await pool.query(
          `SELECT wu.workspaceid, w.name AS workspace_name, wu.role AS ws_role
           FROM workspaceusers wu
           JOIN workspaces w ON w.workspaceid = wu.workspaceid
           WHERE wu.userid = $1 AND w.isactive IS NOT FALSE
           ORDER BY (w.type = 'hospital') DESC, w.createdat ASC
           LIMIT 1`,
          [dbUser.userid]
        );
        if (m.rows.length > 0) membership = m.rows[0];
      } catch (e) {
        console.warn('Workspace lookup failed, using fallback workspace:', e);
      }
    }

    const resolvedUser = {
      id: dbUser?.userid ?? '123e4567-e89b-12d3-a456-426614174000',
      email: dbUser?.email ?? lookupEmail,
      username: loginIdentifier,
      name: dbUser?.name ?? 'Admin User',
      firstName: dbUser?.name?.split(' ')[0] ?? 'Admin',
      lastName: dbUser?.name?.split(' ').slice(1).join(' ') ?? 'User',
      role: 'Admin',
      workspaceId: membership?.workspaceid ?? FALLBACK_WORKSPACE_ID,
      workspaceName: membership?.workspace_name ?? 'Hospital 1',
    };

    // Map the platform's facility role onto this app's module-access roles.
    // Clinical roles get reception (patients/appointments/billing); admins get
    // everything; pharmacists additionally need inventory.
    const wsRoleMap: Record<string, string> = {
      administrator:   'SUPER_ADMIN',
      doctor:          'RECEPTION_ADMIN',
      nurse:           'RECEPTION_ADMIN',
      receptionist:    'RECEPTION_ADMIN',
      plastic_surgeon: 'RECEPTION_ADMIN',
      lab_technician:  'RECEPTION_ADMIN',
      pharmacist:      'INVENTORY_ADMIN',
    };

    // Legacy demo logins, kept working — these have no `users` row to resolve.
    const roleMap: Record<string, string> = {
      'superadmin': 'SUPER_ADMIN',
      'finance': 'FINANCE_ADMIN',
      'hr': 'HR_ADMIN',
      'inventory': 'INVENTORY_ADMIN',
      'reception': 'RECEPTION_ADMIN',
    };

    const userRole = membership
      ? (wsRoleMap[membership.ws_role] ?? 'RECEPTION_ADMIN')
      : (roleMap[loginIdentifier.toLowerCase()] || 'SUPER_ADMIN');

    // Create session object for cookie — now includes userId, workspaceId, email
    const session = {
      username: loginIdentifier,
      role: userRole,
      timestamp: Date.now(),
      userId: resolvedUser.id,
      workspaceId: resolvedUser.workspaceId,
      workspaceName: resolvedUser.workspaceName,
      facilityRole: membership?.ws_role ?? null,
      email: resolvedUser.email,
    };

    const mockUser = resolvedUser;

    // Encode session as base64 cookie
    const sessionCookie = Buffer.from(JSON.stringify(session)).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: mockUser,
      token: 'mock-jwt-token'
    });

    // Set the session cookie that middleware expects
    response.cookies.set('tibbna_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Error during login:', error);
    
    return NextResponse.json(
      { 
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
