import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, getUserByEmail } from "@/lib/db/queries/user";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "NO_EMAIL" }, { status: 401 });
    }

    // Find user by email
    const dbUser = await getUserByEmail(email);

    if (!dbUser || !dbUser.password) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 401 });
    }

    // Verify password
    const isValid = await verifyPassword(password, dbUser.password);

    if (!isValid) {
      return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 401 });
    }

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: dbUser.userid,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
      },
    });
  } catch (error) {
    console.error("Credentials authentication error:", error);
    // Return 200 with null for any server errors to avoid NextAuth error logs
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
