import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { testPackages, testPackageItems } from "@/lib/db/schema/test-packages";
import { eq, and } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// PUT /api/d/[workspaceid]/lims/test-packages/[packageid] - Update test package
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; packageid: string }> }
) {
  const { workspaceid, packageid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Signed in is not the same as belonging here: without this, one
  // facility's data is reachable by changing the id in the request.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Runs with this facility's identity on the connection, so row-level
  // security scopes every query below in the database itself.
  return await withTenant(workspaceid, async () => {

  try {
    const body = await req.json();
    const { packagename, description, labtype, price, tests } = body;

    if (!packagename || !price || !tests || tests.length === 0) {
      return NextResponse.json(
        { error: "Package name, price, and at least one test are required" },
        { status: 400 }
      );
    }

    // Update package
    await db
      .update(testPackages)
      .set({
        packagename,
        description: description || null,
        labtype: labtype || null,
        price,
        updatedby: user.userid,
        updatedat: new Date(),
      })
      .where(
        and(
          eq(testPackages.packageid, packageid),
          eq(testPackages.workspaceid, workspaceid)
        )
      );

    // Delete existing tests
    await db
      .delete(testPackageItems)
      .where(eq(testPackageItems.packageid, packageid));

    // Add new tests
    if (tests.length > 0) {
      await db.insert(testPackageItems).values(
        tests.map((test: { testcode: string; testname: string }) => ({
          packageid,
          testcode: test.testcode,
          testname: test.testname,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating test package:", error);
    return NextResponse.json({ error: "Failed to update test package" }, { status: 500 });
  }
  });
}

// DELETE /api/d/[workspaceid]/lims/test-packages/[packageid] - Delete test package
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; packageid: string }> }
) {
  const { workspaceid, packageid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Signed in is not the same as belonging here: without this, one
  // facility's data is reachable by changing the id in the request.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Runs with this facility's identity on the connection, so row-level
  // security scopes every query below in the database itself.
  return await withTenant(workspaceid, async () => {

  try {
    // Delete package (cascade will delete items)
    await db
      .delete(testPackages)
      .where(
        and(
          eq(testPackages.packageid, packageid),
          eq(testPackages.workspaceid, workspaceid)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test package:", error);
    return NextResponse.json({ error: "Failed to delete test package" }, { status: 500 });
  }
  });
}
