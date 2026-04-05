# Migrations Applied

## MIGRATION 1: 20260115100000_fix_exchange_rate_sync.sql

- **Timestamp:** 2026-01-15 10:00:00
- **Reason:** Synchronize `exchange_rate` and `taux_change` columns in users table.
- **Details:** Previous schema had two potential sources of truth for exchange rates. This migration unifies them, making `exchange_rate` primary but syncing bi-directionally or falling back to `taux_change` to support legacy code.
- **Impact:** All agents now have synchronized exchange rates (never NULL, defaults to 1.0 or `taux_change`).
- **Status:** ✅ APPLIED
- **Rollback:** Restore previous trigger definitions if necessary (but not recommended as data consistency would be lost).