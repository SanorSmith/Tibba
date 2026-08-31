-- Name the dispensing facility on orders a pharmacy raised for itself.
--
-- A pharmacy order carries two facilities: `workspaceid`, who raised it, and
-- `dispensingworkspaceid`, who fills it. When a pharmacy writes an order for
-- its own counter the two are the same, and every facility records it that way
-- - Alis 256, Karolinska 72, Hospital 1 45, Pharma 2 - except New Pharmacy,
-- whose 109 orders (one bulk import, all stamped 2026-08-31 15:50:51) left
-- the dispensing facility null.
--
-- Nothing is lost by it today: the facility still reads those orders as the
-- sender, and row-level security admits them on either side. But every query
-- that asks "which orders am I dispensing?" skips them, and the default
-- pharmacy routing added this week asks exactly that. This is a difference in
-- how one facility's rows were written, not a difference in meaning, so the
-- rows are brought into line rather than the queries taught to tolerate both.
--
-- Deliberately narrow. Only rows whose sender is a pharmacy are touched: for a
-- hospital, a null dispensing facility may well mean "not yet routed", and
-- guessing that a hospital dispenses its own prescriptions would invent a
-- routing decision nobody made. Those are left alone and stay visible to their
-- sender.

UPDATE pharmacy_orders o
   SET dispensingworkspaceid = o.workspaceid
  FROM workspaces w
 WHERE w.workspaceid = o.workspaceid
   AND o.dispensingworkspaceid IS NULL
   AND w.type = 'pharmacy';
