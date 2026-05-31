-- CREATE NATIONAL DRUGS TABLE
-- This table stores the National Drug List (NDL 1278) data
-- Compatible with OpenEHR medication templates

-- Drop existing table if exists
DROP TABLE IF EXISTS national_drugs CASCADE;

-- Create national_drugs table
CREATE TABLE national_drugs (
    id SERIAL PRIMARY KEY,
    row_number INTEGER,
    source VARCHAR(50),
    national_code VARCHAR(100) UNIQUE NOT NULL,
    inn VARCHAR(500),
    drug_name VARCHAR(500),
    strength VARCHAR(200),
    dosage_form VARCHAR(200),
    route VARCHAR(200),
    biological_products VARCHAR(100),
    biosimilar VARCHAR(100),
    medical_device VARCHAR(100),
    edl VARCHAR(100),
    orphan VARCHAR(100),
    notes TEXT,
    
    -- OpenEHR compatible fields
    atc_code VARCHAR(50),
    category VARCHAR(200),
    subcategory VARCHAR(200),
    manufacturer VARCHAR(300),
    price DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'IQD',
    
    -- Status and metadata
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for faster searching
    CONSTRAINT unique_national_code UNIQUE (national_code)
);

-- Create indexes for common searches
CREATE INDEX idx_national_drugs_drug_name ON national_drugs(drug_name);
CREATE INDEX idx_national_drugs_inn ON national_drugs(inn);
CREATE INDEX idx_national_drugs_national_code ON national_drugs(national_code);
CREATE INDEX idx_national_drugs_dosage_form ON national_drugs(dosage_form);
CREATE INDEX idx_national_drugs_route ON national_drugs(route);
CREATE INDEX idx_national_drugs_category ON national_drugs(category);
CREATE INDEX idx_national_drugs_active ON national_drugs(active);

-- Create OpenEHR-compatible medication template table
DROP TABLE IF EXISTS openehr_medications CASCADE;

CREATE TABLE openehr_medications (
    id SERIAL PRIMARY KEY,
    medication_id VARCHAR(100) UNIQUE NOT NULL,
    medication_name VARCHAR(500) NOT NULL,
    generic_name VARCHAR(500),
    brand_name VARCHAR(500),
    
    -- Medication details
    dose_form VARCHAR(200),
    strength VARCHAR(200),
    strength_unit VARCHAR(50),
    administration_route VARCHAR(200),
    
    -- Classification
    atc_code VARCHAR(50),
    therapeutic_category VARCHAR(200),
    pharmacological_class VARCHAR(200),
    
    -- Reference to national drug list
    ndl_reference VARCHAR(100),
    national_code VARCHAR(100),
    
    -- Manufacturer and pricing
    manufacturer VARCHAR(300),
    price DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'IQD',
    
    -- OpenEHR specific fields
    composition_uid VARCHAR(200),
    archetype_id VARCHAR(200) DEFAULT 'openEHR-EHR-COMPOSITION.medication_list.v1',
    template_id VARCHAR(200) DEFAULT 'Medication List',
    
    -- Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to national drugs
    FOREIGN KEY (national_code) REFERENCES national_drugs(national_code) ON DELETE SET NULL
);

-- Create indexes for OpenEHR medications
CREATE INDEX idx_openehr_medications_name ON openehr_medications(medication_name);
CREATE INDEX idx_openehr_medications_generic ON openehr_medications(generic_name);
CREATE INDEX idx_openehr_medications_national_code ON openehr_medications(national_code);
CREATE INDEX idx_openehr_medications_atc_code ON openehr_medications(atc_code);
CREATE INDEX idx_openehr_medications_active ON openehr_medications(active);

-- Create medication inventory table (for stock management)
DROP TABLE IF EXISTS medication_inventory CASCADE;

CREATE TABLE medication_inventory (
    id SERIAL PRIMARY KEY,
    medication_id VARCHAR(100) NOT NULL,
    national_code VARCHAR(100),
    
    -- Inventory details
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity_in_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_of_measure VARCHAR(50),
    
    -- Location
    storage_location VARCHAR(200),
    department_id VARCHAR(100),
    
    -- Pricing
    unit_cost DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (medication_id) REFERENCES openehr_medications(medication_id) ON DELETE CASCADE,
    FOREIGN KEY (national_code) REFERENCES national_drugs(national_code) ON DELETE SET NULL
);

-- Create indexes for inventory
CREATE INDEX idx_medication_inventory_medication_id ON medication_inventory(medication_id);
CREATE INDEX idx_medication_inventory_national_code ON medication_inventory(national_code);
CREATE INDEX idx_medication_inventory_status ON medication_inventory(status);
CREATE INDEX idx_medication_inventory_expiry_date ON medication_inventory(expiry_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_national_drugs_updated_at
    BEFORE UPDATE ON national_drugs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_openehr_medications_updated_at
    BEFORE UPDATE ON openehr_medications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'National Drugs tables created successfully' as status,
       'Tables: national_drugs, openehr_medications, medication_inventory' as tables_created,
       CURRENT_TIMESTAMP as created_at;
