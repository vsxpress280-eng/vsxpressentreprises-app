/* 
 * SCRIPT B: CLEANUP PROFILES
 * --------------------------
 * TARGET: public.users table.
 * ACTION: Deletes all user profiles EXCEPT the master admin.
 * SAFETY: Preserves admin@vsxpress.com (fdb9953a-fff2-4b77-8495-4cdf4b6cca6b).
 * NOTE: Ensure Script A is run FIRST to remove Foreign Key constraints from operational tables.
 */

BEGIN;

-- 1. Delete all users except the master admin
DELETE FROM public.users 
WHERE email != 'admin@vsxpress.com' 
  AND id != 'fdb9953a-fff2-4b77-8495-4cdf4b6cca6b';

-- 2. Force ensure the master admin has the correct role
UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@vsxpress.com' OR id = 'fdb9953a-fff2-4b77-8495-4cdf4b6cca6b';

COMMIT;

-- 3. Verification
SELECT id, email, role, created_at 
FROM public.users;

-- Validation check
DO $$
DECLARE
    user_count integer;
    admin_check record;
BEGIN
    SELECT count(*) INTO user_count FROM public.users;
    
    IF user_count != 1 THEN
        RAISE NOTICE 'WARNING: Unexpected number of users remaining: %', user_count;
    END IF;

    SELECT * INTO admin_check FROM public.users WHERE email = 'admin@vsxpress.com';
    
    IF admin_check.role != 'admin' THEN
        RAISE NOTICE 'WARNING: Admin user does not have admin role!';
    END IF;
END $$;