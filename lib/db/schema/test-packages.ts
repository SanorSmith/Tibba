import { pgTable, uuid, varchar, text, numeric, timestamp, index, boolean } from "drizzle-orm/pg-core";

// Test Packages table - stores package definitions
export const testPackages = pgTable(
  "test_packages",
  {
    packageid: uuid("packageid").defaultRandom().primaryKey(),
    workspaceid: uuid("workspaceid").notNull(),
    packagename: varchar("packagename", { length: 255 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    isactive: boolean("isactive").notNull().default(true),
    
    // Audit fields
    createdby: uuid("createdby").notNull(),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedby: uuid("updatedby"),
    updatedat: timestamp("updatedat", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index("test_packages_workspace_idx").on(table.workspaceid),
    packagenameIdx: index("test_packages_packagename_idx").on(table.packagename),
    activeIdx: index("test_packages_active_idx").on(table.isactive),
  })
);

// Test Package Items table - stores tests included in each package
export const testPackageItems = pgTable(
  "test_package_items",
  {
    itemid: uuid("itemid").defaultRandom().primaryKey(),
    packageid: uuid("packageid").notNull().references(() => testPackages.packageid, { onDelete: "cascade" }),
    testcode: varchar("testcode", { length: 50 }).notNull(),
    testname: varchar("testname", { length: 255 }).notNull(),
    
    // Audit fields
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    packageIdx: index("test_package_items_package_idx").on(table.packageid),
    testcodeIdx: index("test_package_items_testcode_idx").on(table.testcode),
  })
);

export type TestPackage = typeof testPackages.$inferSelect;
export type NewTestPackage = typeof testPackages.$inferInsert;
export type TestPackageItem = typeof testPackageItems.$inferSelect;
export type NewTestPackageItem = typeof testPackageItems.$inferInsert;
