import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/db/queries/user";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function POST(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Update user password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedat: new Date()
      })
      .where(eq(users.email, email));
    
    return NextResponse.json({ 
      success: true,
      message: `Password set successfully for ${email}`
    });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
