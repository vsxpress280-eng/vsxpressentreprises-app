# Production Data Reset Checklist

Use this checklist to track the progress of the data reset operation.

## 1. Before Reset
- [ ] **Backup**: Manually export a backup of the current database (Structure + Data).
- [ ] **Verify Admin**: Confirm `admin@vsxpress.com` exists in both `public.users` and `auth.users`.
- [ ] **Audit Current State**: Run `reset_data_production_AUDIT.sql` and save the results for comparison.
- [ ] **Notify Team**: Ensure no active users are performing transactions.

## 2. Script Execution
### Step A: Purge Operations
- [ ] Execute `reset_data_production_A_purge_operations.sql`.
- [ ] **Verify**: Check verification output. All counts for operational tables should be `0`.
- [ ] **Verify**: `public.users` and `registration_requests` should still have data.

### Step B: Cleanup Profiles
- [ ] Execute `reset_data_production_B_cleanup_profiles.sql`.
- [ ] **Verify**: `public.users` count should be `1`.
- [ ] **Verify**: Remaining user is `admin@vsxpress.com` with role `admin`.

### Step C: Cleanup Auth
- [ ] Execute `reset_data_production_C_cleanup_auth_MANUAL.sql`.
- [ ] **Verify**: `auth.users` count should be `1` (or matching admins).

## 3. After Reset
- [ ] **Table Counts**: 
    - [ ] `transfers`: 0
    - [ ] `wallets`: 0
    - [ ] `deposits`: 0
    - [ ] `transactions`: 0
- [ ] **User Counts**:
    - [ ] `public.users`: 1
    - [ ] `auth.users`: 1
- [ ] **Preserved Data**:
    - [ ] `registration_requests`: Should NOT be empty (unless it was empty before).

## 4. Final Validation
- [ ] **Login**: Attempt login with `admin@vsxpress.com`.
- [ ] **Dashboard**: Verify Admin Dashboard loads with 0 stats.
- [ ] **Functionality**: Create a test agent account (optional but recommended to verify FK integrity).