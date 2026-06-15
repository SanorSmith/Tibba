import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { testPackages, testPackageItems } from "@/lib/db/schema/test-packages";
import { users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/d/[workspaceid]/lims/test-packages - Get all test packages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get all packages for the workspace
    const packages = await db
      .select({
        packageid: testPackages.packageid,
        packagename: testPackages.packagename,
        description: testPackages.description,
        labtype: testPackages.labtype,
        price: testPackages.price,
        isactive: testPackages.isactive,
        createdat: testPackages.createdat,
        createdbyname: users.name,
      })
      .from(testPackages)
      .leftJoin(users, eq(testPackages.createdby, users.userid))
      .where(eq(testPackages.workspaceid, workspaceid))
      .orderBy(desc(testPackages.createdat));

    // Get tests for each package
    const packagesWithTests = await Promise.all(
      packages.map(async (pkg) => {
        const tests = await db
          .select({
            itemid: testPackageItems.itemid,
            testcode: testPackageItems.testcode,
            testname: testPackageItems.testname,
          })
          .from(testPackageItems)
          .where(eq(testPackageItems.packageid, pkg.packageid));

        return {
          ...pkg,
          tests,
        };
      })
    );

    return NextResponse.json(packagesWithTests);
  } catch (error) {
    console.error("Error fetching test packages:", error);
    return NextResponse.json({ error: "Failed to fetch test packages" }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/lims/test-packages - Create new test package
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { packagename, description, labtype, price, tests } = body;

    if (!packagename || !price || !tests || tests.length === 0) {
      return NextResponse.json(
        { error: "Package name, price, and at least one test are required" },
        { status: 400 }
      );
    }

    // Create package
    const [newPackage] = await db
      .insert(testPackages)
      .values({
        workspaceid,
        packagename,
        description: description || null,
        labtype: labtype || null,
        price,
        createdby: user.userid,
      })
      .returning();

    // Add tests to package
    if (tests.length > 0) {
      await db.insert(testPackageItems).values(
        tests.map((test: { testcode: string; testname: string }) => ({
          packageid: newPackage.packageid,
          testcode: test.testcode,
          testname: test.testname,
        }))
      );
    }

    return NextResponse.json({ success: true, packageid: newPackage.packageid }, { status: 201 });
  } catch (error) {
    console.error("Error creating test package:", error);
    return NextResponse.json({ error: "Failed to create test package" }, { status: 500 });
  }
}
