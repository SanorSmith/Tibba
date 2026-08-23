-- One fact, two columns, and the code split between them.
--
-- `items` carries both `inventory_category` and `inventorycategory`. The
-- first holds the data — 4,808 pharmacy, 4 lab — and is what the Drizzle
-- schema has always mapped `items.inventorycategory` onto. The second is a
-- stray physical column, null on all 4,812 rows, and the hand-written SQL in
-- the reports and pharmacy routes was reading that one.
--
-- The effect was quiet: filtering an inventory by category matched nothing,
-- so a lab looking at its own items saw an empty list and a pharmacy report
-- filtered by category came back blank. It read as "no data" rather than as
-- a fault, which is why it survived.
--
-- The queries now read `inventory_category`. Dropping the duplicate is what
-- stops the next one from picking the wrong half.

ALTER TABLE items DROP COLUMN IF EXISTS inventorycategory;
