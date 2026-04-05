/* 
 * SCRIPT C: CLEANUP AUTH (MANUAL EXECUTION REQUIRED)
 * --------------------------------------------------
 * ⚠️ DANGER ZONE ⚠️
 * TARGET: auth.users (Supabase Auth System Table).
 * ACTION: Deletes login accounts.
 * 
 * IMPORTANT: 
 * 1. This script interacts with the `auth` schema which is protected.
 * 2. This usually requires Service Role privileges or execution via Supabase SQL Editor.
 * 3. This will prevent deleted users from logging in even if their public profile exists.
 */

-- 1. Delete all auth accounts except the master admin
DELETE FROM auth.users 
WHERE email NOT IN ('admin@vsxpress.com');

-- 2. Verification
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users;