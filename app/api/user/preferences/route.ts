import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { type UserPreferences, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/user";
import { LANGUAGE_IDS } from "@/content/common";
import { getUser } from "@/lib/user";

export async function GET() {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const sessionUser = await getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user preferences
    const user = await db
      .select({
        theme: users.theme,
        language: users.language,
      })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user[0]);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const sessionUser = await getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { theme, language } = await request.json();

    // Validate theme values
    if (theme && !["light", "dark", "system"].includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme value" },
        { status: 400 },
      );
    }

    if (language && !LANGUAGE_IDS.includes(language)) {
      return NextResponse.json(
        { error: "Invalid language value" },
        { status: 400 },
      );
    }

    // Update user preferences
    const updateData: UserPreferences = {};
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid preferences provided" },
        { status: 400 },
      );
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.email, session.user.email));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
