-- Service Payments Migration
-- Tracks payments from hospital to service providers for services rendered

-- Service Balance Sheet - tracks service provider balances
CREATE TABLE service_balance_sheet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_provider_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id),
    service_type VARCHAR(50) NOT NULL,
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) GENERATED ALWAYS AS (total_earned - total_paid) STORED,
    last_payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Invoice Items - tracks services provided in each invoice
CREATE TABLE service_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_provider_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id),
    service_type VARCHAR(50) NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    service_fee DECIMAL(15,2) NOT NULL, -- Fee charged by service provider
    hospital_earnings DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - service_fee) STORED,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_id UUID REFERENCES service_payments(id),
    invoice_date DATE NOT NULL,
    patient_name VARCHAR(200) NOT NULL,
    patient_id UUID REFERENCES patients(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Payments - tracks payments made to service providers
CREATE TABLE service_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL, -- SP-2024-001 format
    service_provider_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id),
    total_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- BANK_TRANSFER, CASH, CHECK
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, CANCELLED
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_service_balance_sheet_provider ON service_balance_sheet(service_provider_id);
CREATE INDEX idx_service_balance_sheet_type ON service_balance_sheet(service_type);
CREATE INDEX idx_service_invoice_items_invoice ON service_invoice_items(invoice_id);
CREATE INDEX idx_service_invoice_items_provider ON service_invoice_items(service_provider_id);
CREATE INDEX idx_service_invoice_items_paid ON service_invoice_items(is_paid);
CREATE INDEX idx_service_invoice_items_date ON service_invoice_items(invoice_date);
CREATE INDEX idx_service_payments_provider ON service_payments(service_provider_id);
CREATE INDEX idx_service_payments_status ON service_payments(status);
CREATE INDEX idx_service_payments_date ON service_payments(payment_date);

-- Function to update service balance sheet when invoice items are created
CREATE OR REPLACE FUNCTION update_service_balance_sheet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO service_balance_sheet (service_provider_id, service_type, total_earned)
    VALUES (NEW.service_provider_id, NEW.service_type, NEW.service_fee)
    ON CONFLICT (service_provider_id, service_type) 
    DO UPDATE SET 
        total_earned = service_balance_sheet.total_earned + NEW.service_fee,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balance sheet
CREATE TRIGGER trigger_update_service_balance_sheet
    AFTER INSERT ON service_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_service_balance_sheet();

-- Function to update balance sheet when payment is made
CREATE OR REPLACE FUNCTION update_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        UPDATE service_balance_sheet 
        SET 
            total_paid = total_paid + NEW.total_amount,
            last_payment_date = NEW.payment_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE service_provider_id = NEW.service_provider_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update balance when payment is completed
CREATE TRIGGER trigger_update_balance_on_payment
    AFTER UPDATE ON service_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_on_payment();

-- Function to mark service items as paid
CREATE OR REPLACE FUNCTION mark_services_as_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        UPDATE service_invoice_items 
        SET is_paid = TRUE, payment_id = NEW.id
        WHERE service_provider_id = NEW.service_provider_id 
        AND is_paid = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark services as paid when payment is completed
CREATE TRIGGER trigger_mark_services_as_paid
    AFTER UPDATE ON service_payments
    FOR EACH ROW
    EXECUTE FUNCTION mark_services_as_paid();

-- RLS Policies
ALTER TABLE service_balance_sheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_payments ENABLE ROW LEVEL SECURITY;

-- Service Balance Sheet Policies
CREATE POLICY "Service balance sheet - Finance full access" ON service_balance_sheet
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('ADMIN', 'FINANCE_MANAGER', 'FINANCE_STAFF')
    );

-- Service Invoice Items Policies
CREATE POLICY "Service invoice items - Finance full access" ON service_invoice_items
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('ADMIN', 'FINANCE_MANAGER', 'FINANCE_STAFF')
    );

-- Service Payments Policies
CREATE POLICY "Service payments - Finance full access" ON service_payments
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('ADMIN', 'FINANCE_MANAGER', 'FINANCE_STAFF')
    );

-- Service Providers can view their own balance
CREATE POLICY "Service providers - view own balance" ON service_balance_sheet
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'SERVICE_PROVIDER' AND 
        service_provider_id = auth.uid()
    );

-- Service Providers can view their own invoice items
CREATE POLICY "Service providers - view own invoice items" ON service_invoice_items
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'SERVICE_PROVIDER' AND 
        service_provider_id = auth.uid()
    );

-- Service Providers can view their own payments
CREATE POLICY "Service providers - view own payments" ON service_payments
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'SERVICE_PROVIDER' AND 
        service_provider_id = auth.uid()
    );

-- Comments
COMMENT ON TABLE service_balance_sheet IS 'Tracks earnings and payments for each service provider';
COMMENT ON TABLE service_invoice_items IS 'Individual services provided in invoices with fee breakdown';
COMMENT ON TABLE service_payments IS 'Payments made from hospital to service providers';
