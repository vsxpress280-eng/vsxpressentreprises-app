/* 
 * SCRIPT: PRE-RESET AUDIT
 * -----------------------
 * ACTION: Lists counts and key details of the database before reset.
 * PURPOSE: Evidence of state before deletion.
 */

-- 1. Count Operational Data
SELECT 'transfers' as table_name, count(*) as count FROM public.transfers
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

-- 2. List Users (Summary)
SELECT 
    role, 
    count(*) as user_count 
FROM public.users 
GROUP BY role;

-- 3. Check Registration Requests (Should be preserved)
SELECT count(*) as registration_requests_count FROM public.registration_requests;

-- 4. Check Wallet Balances (Total system liability)
SELECT 
    sum(balance_htg) as total_htg_liability,
    sum(balance_dop) as total_dop_liability
FROM public.wallets;

-- 5. List specific Admin to be preserved
SELECT id, email, role, created_at 
FROM public.users 
WHERE email = 'admin@vsxpress.com';