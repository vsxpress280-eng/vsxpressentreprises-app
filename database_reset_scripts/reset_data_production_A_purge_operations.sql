/* 
 * SCRIPT A: PURGE OPERATIONS
 * --------------------------
 * TARGET: Operational data tables only.
 * ACTION: Truncates tables to remove all transaction history.
 * SAFETY: Does NOT touch public.users, auth.users, or registration_requests.
 */

BEGIN;

-- 1. Disable triggers to prevent side effects (notifications, logs, updates) during truncation
ALTER TABLE public.transfers DISABLE TRIGGER ALL;
ALTER TABLE public.deposits DISABLE TRIGGER ALL;
ALTER TABLE public.wallets DISABLE TRIGGER ALL;
ALTER TABLE public.transactions DISABLE TRIGGER ALL;
ALTER TABLE public.wallet_deposits DISABLE TRIGGER ALL;
ALTER TABLE public.wallet_transactions DISABLE TRIGGER ALL;
ALTER TABLE public.transfer_messages DISABLE TRIGGER ALL;
ALTER TABLE public.worker_adjustments DISABLE TRIGGER ALL;
ALTER TABLE public.adjustments_history DISABLE TRIGGER ALL;
ALTER TABLE public.admin_actions_log DISABLE TRIGGER ALL;
ALTER TABLE public.audit_logs DISABLE TRIGGER ALL;

-- 2. Truncate tables with CASCADE to handle internal references
-- Note: CASCADE is used here to clean up dependent rows within this set of tables.
-- It will NOT delete users because users are referenced BY these tables, not the other way around.
TRUNCATE TABLE 
  public.transfer_messages,
  public.wallet_transactions,
  public.wallet_deposits,
  public.transactions,
  public.transfers,
  public.deposits,
  public.worker_adjustments,
  public.adjustments_history,
  public.admin_actions_log,
  public.audit_logs,
  public.wallets
CASCADE;

-- 3. Re-enable triggers
ALTER TABLE public.transfers ENABLE TRIGGER ALL;
ALTER TABLE public.deposits ENABLE TRIGGER ALL;
ALTER TABLE public.wallets ENABLE TRIGGER ALL;
ALTER TABLE public.transactions ENABLE TRIGGER ALL;
ALTER TABLE public.wallet_deposits ENABLE TRIGGER ALL;
ALTER TABLE public.wallet_transactions ENABLE TRIGGER ALL;
ALTER TABLE public.transfer_messages ENABLE TRIGGER ALL;
ALTER TABLE public.worker_adjustments ENABLE TRIGGER ALL;
ALTER TABLE public.adjustments_history ENABLE TRIGGER ALL;
ALTER TABLE public.admin_actions_log ENABLE TRIGGER ALL;
ALTER TABLE public.audit_logs ENABLE TRIGGER ALL;

COMMIT;

-- 4. Verification Queries
SELECT 'transfers' as table_name, count(*) as row_count FROM public.transfers
UNION ALL
SELECT 'deposits', count(*) FROM public.deposits
UNION ALL
SELECT 'wallets', count(*) FROM public.wallets
UNION ALL
SELECT 'transactions', count(*) FROM public.transactions
UNION ALL
SELECT 'wallet_deposits', count(*) FROM public.wallet_deposits
UNION ALL
SELECT 'wallet_transactions', count(*) FROM public.wallet_transactions
UNION ALL
SELECT 'transfer_messages', count(*) FROM public.transfer_messages
UNION ALL
SELECT 'worker_adjustments', count(*) FROM public.worker_adjustments
UNION ALL
SELECT 'adjustments_history', count(*) FROM public.adjustments_history
UNION ALL
SELECT 'admin_actions_log', count(*) FROM public.admin_actions_log
UNION ALL
SELECT 'audit_logs', count(*) FROM public.audit_logs;