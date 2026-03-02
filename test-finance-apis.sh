#!/bin/bash
# Test all Finance APIs to check database connections vs demo data
# Run this script to verify which APIs use real database data

echo "🧪 TESTING FINANCE APIS - DATABASE vs DEMO DATA"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test API and analyze response
test_api() {
    local api_name=$1
    local api_url=$2
    local expected_field=$3
    
    echo -e "\n${YELLOW}Testing: $api_name${NC}"
    echo "URL: $api_url"
    
    response=$(curl -s "$api_url")
    
    if [[ $? -eq 0 ]]; then
        # Check if response contains database-like data
        if echo "$response" | grep -q '"id"'; then
            # Check for UUID format (database indicator)
            if echo "$response" | grep -qE '"id":\s*"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'; then
                echo -e "${GREEN}✅ DATABASE CONNECTED${NC} - Found UUID IDs"
                echo "Sample data: $(echo "$response" | jq -r '.[0] | {id, name: .name // .item_name // .full_name // .invoice_number // .request_number}' 2>/dev/null || echo "JSON parse failed")"
            else
                echo -e "${RED}❌ POSSIBLE DEMO DATA${NC} - No UUID IDs found"
                echo "Response preview: $(echo "$response" | head -c 200)..."
            fi
        else
            echo -e "${RED}❌ ERROR RESPONSE${NC}"
            echo "Response: $response"
        fi
    else
        echo -e "${RED}❌ API FAILED${NC} - HTTP error"
    fi
}

# Function to check for demo data imports
check_demo_imports() {
    echo -e "\n${YELLOW}Checking for demo data imports in API files...${NC}"
    
    api_files=(
        "src/app/api/budget/route.ts"
        "src/app/api/invoices/route.ts"
        "src/app/api/shareholders/route.ts"
        "src/app/api/purchase-requests/route.ts"
        "src/app/api/services/route.ts"
        "src/app/api/service-payments/route.ts"
        "src/app/api/insurance-companies/route.ts"
        "src/app/api/invoice-returns/route.ts"
    )
    
    for file in "${api_files[@]}"; do
        if [ -f "$file" ]; then
            if grep -q "import.*\.json" "$file"; then
                echo -e "${RED}❌ $file - Contains JSON import (possible demo data)${NC}"
                grep -n "import.*\.json" "$file" | head -1
            elif grep -q "fallback" "$file"; then
                echo -e "${YELLOW}⚠️  $file - Contains fallback logic${NC}"
                grep -n "fallback" "$file" | head -1
            else
                echo -e "${GREEN}✅ $file - Pure database connection${NC}"
            fi
        fi
    done
}

# Function to check data sources in data directory
check_data_directory() {
    echo -e "\n${YELLOW}Checking data directory for demo files...${NC}"
    
    if [ -d "src/data" ]; then
        echo "Data directory contents:"
        find src/data -name "*.json" -type f | while read file; do
            size=$(wc -c < "$file")
            echo -e "${YELLOW}📄 $file ($size bytes)${NC}"
        done
    else
        echo -e "${GREEN}✅ No data directory found${NC}"
    fi
}

# Test all Finance APIs
echo -e "\n${YELLOW}=== TESTING FINANCE APIS ===${NC}"

test_api "Budget API" "http://localhost:3000/api/budget" "period_name"
test_api "Invoices API" "http://localhost:3000/api/invoices" "invoice_number"
test_api "Shareholders API" "http://localhost:3000/api/shareholders" "full_name"
test_api "Purchase Requests API" "http://localhost:3000/api/purchase-requests" "request_number"
test_api "Services API" "http://localhost:3000/api/services" "name"
test_api "Service Payments API" "http://localhost:3000/api/service-payments" "invoice_id"
test_api "Insurance Companies API" "http://localhost:3000/api/insurance-companies" "company_name"
test_api "Invoice Returns API" "http://localhost:3000/api/invoice-returns" "return_number"

# Check for demo data imports
check_demo_imports

# Check data directory
check_data_directory

echo -e "\n${YELLOW}=== SUMMARY ===${NC}"
echo "✅ Green = Database connected (real data)"
echo "❌ Red = Demo data or error"
echo "⚠️  Yellow = Fallback logic"
echo ""
echo "Run this script to verify your Finance APIs are using real database data!"
