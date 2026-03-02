#!/bin/bash

# ============================================================================
# TIBBNA HOSPITAL - PROJECT REORGANIZATION SCRIPT
# ============================================================================
# This script safely reorganizes the project file structure
# Preserves all connections between apps, models, files, and code
# ============================================================================

set -e  # Exit on error

echo "🏥 TIBBNA HOSPITAL - PROJECT REORGANIZATION"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 0: SAFETY CHECKS
# ============================================================================

echo -e "${BLUE}📋 Step 0: Safety Checks${NC}"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    echo "Please initialize git first: git init"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo "It's recommended to commit or stash changes before reorganizing"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Safety checks passed${NC}"
echo ""

# ============================================================================
# STEP 1: CREATE BACKUP BRANCH
# ============================================================================

echo -e "${BLUE}📋 Step 1: Creating Backup Branch${NC}"
echo ""

git branch backup-before-reorganization 2>/dev/null || echo "Backup branch already exists"
echo -e "${GREEN}✅ Backup branch created: backup-before-reorganization${NC}"
echo ""

# ============================================================================
# STEP 2: CREATE NEW DIRECTORY STRUCTURE
# ============================================================================

echo -e "${BLUE}📋 Step 2: Creating New Directory Structure${NC}"
echo ""

# Documentation directories
mkdir -p docs/architecture
mkdir -p docs/modules/finance
mkdir -p docs/modules/hr
mkdir -p docs/modules/ui
mkdir -p docs/database
mkdir -p docs/sql

# Script directories
mkdir -p scripts/database/check
mkdir -p scripts/database/verify
mkdir -p scripts/database/find
mkdir -p scripts/database/compare
mkdir -p scripts/database/investigate
mkdir -p scripts/database/tools
mkdir -p scripts/testing/api
mkdir -p scripts/testing/appointments
mkdir -p scripts/testing/staff
mkdir -p scripts/testing/finance
mkdir -p scripts/sql

# Database directories
mkdir -p database/migrations
mkdir -p database/seeds
mkdir -p database/queries

echo -e "${GREEN}✅ Directory structure created${NC}"
echo ""

# ============================================================================
# STEP 3: MOVE DOCUMENTATION FILES
# ============================================================================

echo -e "${BLUE}📋 Step 3: Moving Documentation Files${NC}"
echo ""

# Architecture docs
[ -f "BLUEPRINT.md" ] && git mv BLUEPRINT.md docs/architecture/ && echo "  ✓ Moved BLUEPRINT.md"
[ -f "DATABASE_CONNECTIONS_REPORT.md" ] && git mv DATABASE_CONNECTIONS_REPORT.md docs/architecture/ && echo "  ✓ Moved DATABASE_CONNECTIONS_REPORT.md"
[ -f "DEVELOPMENT_ROADMAP.md" ] && git mv DEVELOPMENT_ROADMAP.md docs/architecture/ && echo "  ✓ Moved DEVELOPMENT_ROADMAP.md"
[ -f "TIBBNA_OPENEHR_INTEGRATION.md" ] && git mv TIBBNA_OPENEHR_INTEGRATION.md docs/architecture/ && echo "  ✓ Moved TIBBNA_OPENEHR_INTEGRATION.md"

# Finance module docs
[ -f "FINANCE_API_ANALYSIS.md" ] && git mv FINANCE_API_ANALYSIS.md docs/modules/finance/ && echo "  ✓ Moved FINANCE_API_ANALYSIS.md"
[ -f "FINANCE_DB_MIGRATION_SUMMARY.md" ] && git mv FINANCE_DB_MIGRATION_SUMMARY.md docs/modules/finance/ && echo "  ✓ Moved FINANCE_DB_MIGRATION_SUMMARY.md"
[ -f "FINANCE_DEMO_DATA_ANALYSIS.md" ] && git mv FINANCE_DEMO_DATA_ANALYSIS.md docs/modules/finance/ && echo "  ✓ Moved FINANCE_DEMO_DATA_ANALYSIS.md"
[ -f "FINANCE_HR_DB_ANALYSIS.md" ] && git mv FINANCE_HR_DB_ANALYSIS.md docs/modules/finance/ && echo "  ✓ Moved FINANCE_HR_DB_ANALYSIS.md"
[ -f "INSURANCE_MODULE_STATUS.md" ] && git mv INSURANCE_MODULE_STATUS.md docs/modules/finance/ && echo "  ✓ Moved INSURANCE_MODULE_STATUS.md"

# HR module docs
[ -f "hr-module-completion-report.md" ] && git mv hr-module-completion-report.md docs/modules/hr/ && echo "  ✓ Moved hr-module-completion-report.md"
[ -f "hr-module-verification-report.md" ] && git mv hr-module-verification-report.md docs/modules/hr/ && echo "  ✓ Moved hr-module-verification-report.md"

# UI docs
[ -f "PATIENT_FORM_STYLING_UPDATE.md" ] && git mv PATIENT_FORM_STYLING_UPDATE.md docs/modules/ui/ && echo "  ✓ Moved PATIENT_FORM_STYLING_UPDATE.md"
[ -f "RESPONSIVE_AUDIT.md" ] && git mv RESPONSIVE_AUDIT.md docs/modules/ui/ && echo "  ✓ Moved RESPONSIVE_AUDIT.md"
[ -f "RESPONSIVE_STATUS.md" ] && git mv RESPONSIVE_STATUS.md docs/modules/ui/ && echo "  ✓ Moved RESPONSIVE_STATUS.md"
[ -f "UI_RENAMING_SUMMARY.md" ] && git mv UI_RENAMING_SUMMARY.md docs/modules/ui/ && echo "  ✓ Moved UI_RENAMING_SUMMARY.md"

# Database docs
[ -f "DATABASE_NAME_CHANGE_SUMMARY.md" ] && git mv DATABASE_NAME_CHANGE_SUMMARY.md docs/database/ && echo "  ✓ Moved DATABASE_NAME_CHANGE_SUMMARY.md"
[ -f "SHARED_DATABASE_SETUP.md" ] && git mv SHARED_DATABASE_SETUP.md docs/database/ && echo "  ✓ Moved SHARED_DATABASE_SETUP.md"
[ -f "MIGRATE_DEMO_DATA_TO_DATABASE.md" ] && git mv MIGRATE_DEMO_DATA_TO_DATABASE.md docs/database/ && echo "  ✓ Moved MIGRATE_DEMO_DATA_TO_DATABASE.md"

# SQL docs
[ -f "CORRECT_SERVICES_SQL.md" ] && git mv CORRECT_SERVICES_SQL.md docs/sql/ && echo "  ✓ Moved CORRECT_SERVICES_SQL.md"

echo -e "${GREEN}✅ Documentation files moved${NC}"
echo ""

# ============================================================================
# STEP 4: MOVE DATABASE CHECK SCRIPTS
# ============================================================================

echo -e "${BLUE}📋 Step 4: Moving Database Check Scripts${NC}"
echo ""

[ -f "check-appointments-schema.js" ] && git mv check-appointments-schema.js scripts/database/check/ && echo "  ✓ Moved check-appointments-schema.js"
[ -f "check-both-systems.js" ] && git mv check-both-systems.js scripts/database/check/ && echo "  ✓ Moved check-both-systems.js"
[ -f "check-database-host.js" ] && git mv check-database-host.js scripts/database/check/ && echo "  ✓ Moved check-database-host.js"
[ -f "check-doctor-roles.js" ] && git mv check-doctor-roles.js scripts/database/check/ && echo "  ✓ Moved check-doctor-roles.js"
[ -f "check-doctors-table.js" ] && git mv check-doctors-table.js scripts/database/check/ && echo "  ✓ Moved check-doctors-table.js"
[ -f "check-enum-types.js" ] && git mv check-enum-types.js scripts/database/check/ && echo "  ✓ Moved check-enum-types.js"
[ -f "check-invoice-tables.js" ] && git mv check-invoice-tables.js scripts/database/check/ && echo "  ✓ Moved check-invoice-tables.js"
[ -f "check-patient-table.js" ] && git mv check-patient-table.js scripts/database/check/ && echo "  ✓ Moved check-patient-table.js"
[ -f "check-schema.js" ] && git mv check-schema.js scripts/database/check/ && echo "  ✓ Moved check-schema.js"
[ -f "check-staff-users-relationship.js" ] && git mv check-staff-users-relationship.js scripts/database/check/ && echo "  ✓ Moved check-staff-users-relationship.js"
[ -f "check-table-simple.js" ] && git mv check-table-simple.js scripts/database/check/ && echo "  ✓ Moved check-table-simple.js"
[ -f "check-table.js" ] && git mv check-table.js scripts/database/check/ && echo "  ✓ Moved check-table.js"
[ -f "check-webapp-db.js" ] && git mv check-webapp-db.js scripts/database/check/ && echo "  ✓ Moved check-webapp-db.js"
[ -f "check-workspace.js" ] && git mv check-workspace.js scripts/database/check/ && echo "  ✓ Moved check-workspace.js"

echo -e "${GREEN}✅ Database check scripts moved${NC}"
echo ""

# ============================================================================
# STEP 5: MOVE DATABASE UTILITY SCRIPTS
# ============================================================================

echo -e "${BLUE}📋 Step 5: Moving Database Utility Scripts${NC}"
echo ""

# Verify scripts
[ -f "verify-appointments-data.js" ] && git mv verify-appointments-data.js scripts/database/verify/ && echo "  ✓ Moved verify-appointments-data.js"
[ -f "verify-webapp-patient-fixed.js" ] && git mv verify-webapp-patient-fixed.js scripts/database/verify/ && echo "  ✓ Moved verify-webapp-patient-fixed.js"
[ -f "verify-webapp-patient.js" ] && git mv verify-webapp-patient.js scripts/database/verify/ && echo "  ✓ Moved verify-webapp-patient.js"

# Find scripts
[ -f "find-dddds1-smith.js" ] && git mv find-dddds1-smith.js scripts/database/find/ && echo "  ✓ Moved find-dddds1-smith.js"
[ -f "find-national-id-10101010.js" ] && git mv find-national-id-10101010.js scripts/database/find/ && echo "  ✓ Moved find-national-id-10101010.js"
[ -f "find-national-id.js" ] && git mv find-national-id.js scripts/database/find/ && echo "  ✓ Moved find-national-id.js"
[ -f "find-specific-patients.js" ] && git mv find-specific-patients.js scripts/database/find/ && echo "  ✓ Moved find-specific-patients.js"

# Compare scripts
[ -f "compare-patient-data.js" ] && git mv compare-patient-data.js scripts/database/compare/ && echo "  ✓ Moved compare-patient-data.js"
[ -f "compare-patients.js" ] && git mv compare-patients.js scripts/database/compare/ && echo "  ✓ Moved compare-patients.js"
[ -f "count-patients.js" ] && git mv count-patients.js scripts/database/compare/ && echo "  ✓ Moved count-patients.js"

# Investigate scripts
[ -f "investigate-missing-record.js" ] && git mv investigate-missing-record.js scripts/database/investigate/ && echo "  ✓ Moved investigate-missing-record.js"
[ -f "investigate-patients.js" ] && git mv investigate-patients.js scripts/database/investigate/ && echo "  ✓ Moved investigate-patients.js"

# Database tools
[ -f "database-explorer-server.js" ] && git mv database-explorer-server.js scripts/database/tools/ && echo "  ✓ Moved database-explorer-server.js"
[ -f "database-explorer.js" ] && git mv database-explorer.js scripts/database/tools/ && echo "  ✓ Moved database-explorer.js"

echo -e "${GREEN}✅ Database utility scripts moved${NC}"
echo ""

# ============================================================================
# STEP 6: MOVE TEST SCRIPTS
# ============================================================================

echo -e "${BLUE}📋 Step 6: Moving Test Scripts${NC}"
echo ""

# API tests
[ -f "test-doctors-api-debug.js" ] && git mv test-doctors-api-debug.js scripts/testing/api/ && echo "  ✓ Moved test-doctors-api-debug.js"
[ -f "test-doctors-api.js" ] && git mv test-doctors-api.js scripts/testing/api/ && echo "  ✓ Moved test-doctors-api.js"
[ -f "test-ehrbase-doctors.js" ] && git mv test-ehrbase-doctors.js scripts/testing/api/ && echo "  ✓ Moved test-ehrbase-doctors.js"
[ -f "test-invoice-api-no-demo.js" ] && git mv test-invoice-api-no-demo.js scripts/testing/api/ && echo "  ✓ Moved test-invoice-api-no-demo.js"
[ -f "test-invoice-api.js" ] && git mv test-invoice-api.js scripts/testing/api/ && echo "  ✓ Moved test-invoice-api.js"
[ -f "test-patient-api-debug.js" ] && git mv test-patient-api-debug.js scripts/testing/api/ && echo "  ✓ Moved test-patient-api-debug.js"
[ -f "test-patient-api-fixed.js" ] && git mv test-patient-api-fixed.js scripts/testing/api/ && echo "  ✓ Moved test-patient-api-fixed.js"
[ -f "test-patient-search.js" ] && git mv test-patient-search.js scripts/testing/api/ && echo "  ✓ Moved test-patient-search.js"
[ -f "test-patients-api-new-name.js" ] && git mv test-patients-api-new-name.js scripts/testing/api/ && echo "  ✓ Moved test-patients-api-new-name.js"
[ -f "test-patients-simple.js" ] && git mv test-patients-simple.js scripts/testing/api/ && echo "  ✓ Moved test-patients-simple.js"

# Appointment tests
[ -f "test-appointment-creation.js" ] && git mv test-appointment-creation.js scripts/testing/appointments/ && echo "  ✓ Moved test-appointment-creation.js"
[ -f "test-appointments-connection.js" ] && git mv test-appointments-connection.js scripts/testing/appointments/ && echo "  ✓ Moved test-appointments-connection.js"
[ -f "test-doctor-availability.js" ] && git mv test-doctor-availability.js scripts/testing/appointments/ && echo "  ✓ Moved test-doctor-availability.js"

# Staff tests
[ -f "test-all-medical-staff.js" ] && git mv test-all-medical-staff.js scripts/testing/staff/ && echo "  ✓ Moved test-all-medical-staff.js"

# Finance tests
[ -f "test-finance-apis.sh" ] && git mv test-finance-apis.sh scripts/testing/finance/ && echo "  ✓ Moved test-finance-apis.sh"
[ -f "test-finance-urls.txt" ] && git mv test-finance-urls.txt scripts/testing/finance/ && echo "  ✓ Moved test-finance-urls.txt"

# SQL tests
[ -f "test-services-data.sql" ] && git mv test-services-data.sql scripts/sql/ && echo "  ✓ Moved test-services-data.sql"

echo -e "${GREEN}✅ Test scripts moved${NC}"
echo ""

# ============================================================================
# STEP 7: MOVE DATABASE FILES
# ============================================================================

echo -e "${BLUE}📋 Step 7: Moving Database Files${NC}"
echo ""

# SQL seeds
[ -f "INSERT_INSURANCE_DATA.sql" ] && git mv INSERT_INSURANCE_DATA.sql database/seeds/ && echo "  ✓ Moved INSERT_INSURANCE_DATA.sql"
[ -f "insert-services.sql" ] && git mv insert-services.sql database/seeds/ && echo "  ✓ Moved insert-services.sql"

# Migrations
[ -f "database/create_todos_table.sql" ] && git mv database/create_todos_table.sql database/migrations/ && echo "  ✓ Moved create_todos_table.sql"

echo -e "${GREEN}✅ Database files moved${NC}"
echo ""

# ============================================================================
# STEP 8: CREATE README FILES
# ============================================================================

echo -e "${BLUE}📋 Step 8: Creating README Files${NC}"
echo ""

# docs/README.md
cat > docs/README.md << 'EOF'
# Tibbna Hospital Documentation

## Directory Structure

- `architecture/` - System architecture and design documents
- `modules/` - Module-specific documentation (Finance, HR, UI)
- `database/` - Database setup and migration guides
- `sql/` - SQL examples and best practices

## Key Documents

### Architecture
- [BLUEPRINT.md](architecture/BLUEPRINT.md) - System blueprint
- [DATABASE_CONNECTIONS_REPORT.md](architecture/DATABASE_CONNECTIONS_REPORT.md) - Database connectivity analysis
- [DEVELOPMENT_ROADMAP.md](architecture/DEVELOPMENT_ROADMAP.md) - Development plan

### Finance Module
- [FINANCE_API_ANALYSIS.md](modules/finance/FINANCE_API_ANALYSIS.md)
- [INSURANCE_MODULE_STATUS.md](modules/finance/INSURANCE_MODULE_STATUS.md)

### HR Module
- [hr-module-completion-report.md](modules/hr/hr-module-completion-report.md)
- [hr-module-verification-report.md](modules/hr/hr-module-verification-report.md)
EOF

# scripts/README.md
cat > scripts/README.md << 'EOF'
# Tibbna Hospital Scripts

## Directory Structure

- `database/` - Database utility scripts
  - `check/` - Database schema and connection checks
  - `verify/` - Data verification scripts
  - `find/` - Data search utilities
  - `compare/` - Data comparison tools
  - `investigate/` - Debugging and investigation
  - `tools/` - Database exploration tools
- `testing/` - Test scripts
  - `api/` - API endpoint tests
  - `appointments/` - Appointment system tests
  - `staff/` - Staff management tests
  - `finance/` - Finance module tests
- `sql/` - SQL test queries

## Usage

### Database Checks
```bash
node scripts/database/check/check-database-host.js
node scripts/database/check/check-patient-table.js
```

### API Testing
```bash
node scripts/testing/api/test-doctors-api.js
node scripts/testing/api/test-patient-api-debug.js
```

### Database Explorer
```bash
node scripts/database/tools/database-explorer-server.js
```
EOF

# database/README.md
cat > database/README.md << 'EOF'
# Tibbna Hospital Database

## Directory Structure

- `migrations/` - Database migration scripts
- `seeds/` - Seed data for development
- `queries/` - Common SQL queries

## Main Schema

The main database schema is located at:
- `../supabase/schema.sql` - Complete database schema

## Seed Data

- `seeds/INSERT_INSURANCE_DATA.sql` - Insurance provider sample data
- `seeds/insert-services.sql` - Medical services sample data

## Migrations

- `migrations/create_todos_table.sql` - Example migration
EOF

echo -e "${GREEN}✅ README files created${NC}"
echo ""

# ============================================================================
# STEP 9: COMMIT CHANGES
# ============================================================================

echo -e "${BLUE}📋 Step 9: Committing Changes${NC}"
echo ""

git add .
git commit -m "Reorganize project structure for better maintainability

- Move documentation to docs/ directory
- Move scripts to scripts/ directory
- Move database files to database/ directory
- Create README files for each directory
- Preserve all file history with git mv
- No code changes, only file organization"

echo -e "${GREEN}✅ Changes committed${NC}"
echo ""

# ============================================================================
# COMPLETION
# ============================================================================

echo ""
echo -e "${GREEN}=========================================="
echo "🎉 PROJECT REORGANIZATION COMPLETE!"
echo "==========================================${NC}"
echo ""
echo "Summary:"
echo "  ✓ Backup branch created: backup-before-reorganization"
echo "  ✓ Documentation organized in docs/"
echo "  ✓ Scripts organized in scripts/"
echo "  ✓ Database files organized in database/"
echo "  ✓ README files created"
echo "  ✓ Changes committed to git"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev (to verify app still works)"
echo "  2. Run: npm run build (to verify build works)"
echo "  3. Test a few scripts to verify paths work"
echo ""
echo "If you need to rollback:"
echo "  git checkout backup-before-reorganization"
echo ""
