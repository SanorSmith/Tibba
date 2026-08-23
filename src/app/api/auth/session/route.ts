import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session-token';

export const dynamic = 'force-dynamic';

// Mirrors ROLE_MODULES in src/middleware.ts — the middleware is what actually
// blocks a request, so these must agree or the UI will offer links that then
// bounce the user to /unauthorized.
const ROLE_MODULES: Record<string, string[]> = {
  SUPER_ADMIN:     ['*'],
  FINANCE_ADMIN:   ['/finance'],
  HR_ADMIN:        ['/hr', '/staff'],
  INVENTORY_ADMIN: ['/inventory', '/hospital'],
  RECEPTION_ADMIN: ['/reception'],
};

export async function GET(request: NextRequest) {
  try {
    // Read the real session set at login rather than returning a fixed mock —
    // AuthContext and the /unauthorized page both read this endpoint, so a
    // hardcoded response made every permission decision in the UI fictional
    // (it reported "Administrator" for a nurse, for example).
    const raw = request.cookies.get('tibbna_session')?.value;
    if (!raw) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    // Verified, not merely decoded — this endpoint feeds AuthContext and the
    // /unauthorized page, so an unverified payload would let a forged cookie
    // decide what the UI believes the user may do.
    const session: any = await verifySession(raw);
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const role = session.role ?? 'RECEPTION_ADMIN';

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId ?? null,
        name: session.username ?? session.email ?? 'User',
        email: session.email ?? null,
        role,
        allowedModules: ROLE_MODULES[role] ?? [],
        // Which facility this session is scoped to, and the role held there.
        workspaceId: session.workspaceId ?? null,
        workspaceName: session.workspaceName ?? null,
        facilityRole: session.facilityRole ?? null,
      },
    });

  } catch (error) {
    console.error('Error getting session:', error);

    return NextResponse.json(
      {
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
