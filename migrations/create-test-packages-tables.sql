-- Create test packages tables
-- This allows creating test packages with multiple tests and a package price

-- Test Packages table
CREATE TABLE IF NOT EXISTS test_packages (
    packageid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceid UUID NOT NULL,
    packagename VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    isactive BOOLEAN NOT NULL DEFAULT true,
    createdby UUID NOT NULL,
    createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updatedby UUID,
    updatedat TIMESTAMP WITH TIME ZONE
);

-- Test Package Items table
CREATE TABLE IF NOT EXISTS test_package_items (
    itemid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packageid UUID NOT NULL REFERENCES test_packages(packageid) ON DELETE CASCADE,
    testcode VARCHAR(50) NOT NULL,
    testname VARCHAR(255) NOT NULL,
    createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS test_packages_workspace_idx ON test_packages(workspaceid);
CREATE INDEX IF NOT EXISTS test_packages_packagename_idx ON test_packages(packagename);
CREATE INDEX IF NOT EXISTS test_packages_active_idx ON test_packages(isactive);
CREATE INDEX IF NOT EXISTS test_package_items_package_idx ON test_package_items(packageid);
CREATE INDEX IF NOT EXISTS test_package_items_testcode_idx ON test_package_items(testcode);

-- Add comments
COMMENT ON TABLE test_packages IS 'Test packages with bundled tests and package pricing';
COMMENT ON TABLE test_package_items IS 'Tests included in each package';
COMMENT ON COLUMN test_packages.price IS 'Package price (can be different from sum of individual test prices)';
