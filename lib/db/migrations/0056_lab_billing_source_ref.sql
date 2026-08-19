-- Tags an invoice_items row with which pending lab order/test it was billed
-- from, so the same test can't be billed twice. Two source systems feed the
-- Lab Billing tab: this app's own lims_orders/lims_order_tests (ref =
-- lims_order_tests.ordertestid), and EHR/doctor referrals pulled via
-- /api/lims/orders/openehr (ref = TestOrderRecord.composition_uid). Both are
-- stored as text since the EHR ref isn't a uuid.
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lims_order_test_ref text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lims_order_source text; -- 'LIMS' | 'EHR'
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS workspaceid uuid;

CREATE INDEX IF NOT EXISTS invoice_items_lims_ref_idx ON invoice_items (lims_order_test_ref);
