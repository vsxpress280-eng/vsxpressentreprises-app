# Database Reset Guide

This guide details the procedure for resetting the production database to a clean state while preserving the main administrator account.

## Prerequisites
1.  **Access**: You must have SQL Editor access to the Supabase project.
2.  **Backup**: ALWAYS download a full database backup before running these scripts.
3.  **UUID**: The scripts are hardcoded to preserve admin UUID `fdb9953a-fff2-4b77-8495-4cdf4b6cca6b`.

---

## Execution Steps

### Step 1: Audit (Optional but Recommended)
Run `reset_data_production_AUDIT.sql` to see what the database looks like before deleting anything.

### Step 2: Run Script A (Purge Operations)
This script truncates all high-volume transaction tables.
*   **File**: `reset_data_production_A_purge_operations.sql`
*   **Action**: Copy content -> Paste in Supabase SQL Editor -> Run.
*   **Expected Result**: success message and a table showing `0` rows for all listed tables.

### Step 3: Run Script B (Cleanup Profiles)
This script removes user profiles from the public schema.
*   **File**: `reset_data_production_B_cleanup_profiles.sql`
*   **Action**: Copy content -> Paste in Supabase SQL Editor -> Run.
*   **Expected Result**: Only `admin@vsxpress.com` remains in `public.users`.

### Step 4: Run Script C (Cleanup Auth)
⚠️ **WARNING**: This deletes login credentials.
*   **File**: `reset_data_production_C_cleanup_auth_MANUAL.sql`
*   **Action**: Copy content -> Paste in Supabase SQL Editor -> Run.
*   **Expected Result**: Only `admin@vsxpress.com` remains in `auth.users`.

### Step 5: Final Validation
1.  Log out of the application.
2.  Log in as `admin@vsxpress.com`.
3.  Check the dashboard; it should show 0 transactions/transfers.

---

## Rollback Instructions
If the reset fails or deletes incorrect data:
1.  Do NOT proceed further.
2.  Use the Supabase Dashboard to **Restore** the project from the backup created in the Prerequisites step.