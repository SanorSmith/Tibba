-- Make the suppliers a pharmacy registered visible to its procurement screens.
--
-- There are two supplier registries. A pharmacist registers a supplier on the
-- Suppliers screen, which writes to `suppliers`. Procurement's "Select
-- supplier" dropdown reads `vendors`. So a pharmacy could register a supplier,
-- see it listed under Suppliers, and then find the procurement dropdown empty,
-- with nothing on either screen suggesting they were looking at different
-- lists: New Pharmacy had 1 supplier and 0 vendors.
--
-- The obvious fix - point the dropdown at `suppliers` - is not available:
-- pharmacy_purchase_orders.supplier_id, pharmacy_orders.vendorid,
-- vendor_contracts, vendor_items and vendor_payments all carry foreign keys to
-- `vendors`. Procurement is built on vendors, and an order cannot reference a
-- supplier row. So the registrations are brought across instead.
--
-- Matched on facility and lower(name) so re-running changes nothing, and so a
-- supplier that already has a vendor by the same name is left alone rather
-- than duplicated.
--
-- Only suppliers whose workspaceid is a real workspace are copied. That column
-- is `text` on suppliers and `uuid` on vendors - one of the two spellings this
-- schema carries - so the join casts and the insert converts.

INSERT INTO vendors (id, workspaceid, name, code, contactname, phone, email,
                     address, country, currency, website, notes, isactive,
                     createdat, updatedat)
SELECT gen_random_uuid(),
       s.workspaceid::uuid,
       s.name,
       s.code,
       s.contactperson,
       s.phonenumber,
       s.email,
       s.addressline1,
       s.country,
       s.currency,
       s.website,
       s.notes,
       COALESCE(s.isactive, true),
       now(),
       now()
FROM suppliers s
JOIN workspaces w ON w.workspaceid::text = s.workspaceid
WHERE s.workspaceid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vendors v
     WHERE v.workspaceid = s.workspaceid::uuid
       AND lower(trim(v.name)) = lower(trim(s.name))
  );
