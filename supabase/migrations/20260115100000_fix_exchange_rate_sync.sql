-- Migration: Fix Exchange Rate Synchronization
-- Created at: 2026-01-15 10:00:00

-- 1. Data Migration - Sync existing agents
-- Migrate existing agent exchange rates from taux_change to exchange_rate
UPDATE users
SET exchange_rate = CASE
    WHEN taux_change IS NOT NULL AND taux_change > 0 THEN taux_change
    ELSE 1.0
END
WHERE role = 'agent';

-- 2. Create/Replace Trigger Function
-- Ensure exchange_rate is never NULL and follows taux_change
CREATE OR REPLACE FUNCTION public.sync_exchange_rate_logic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.role = 'agent' THEN
        -- Logic: IF taux_change IS NOT NULL AND taux_change > 0 THEN SET exchange_rate = taux_change ELSE SET exchange_rate = 1.0
        IF NEW.taux_change IS NOT NULL AND NEW.taux_change > 0 THEN
            NEW.exchange_rate := NEW.taux_change;
        ELSE
            NEW.exchange_rate := 1.0;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Cleanup old triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_sync_agent_exchange_rates ON users;
DROP TRIGGER IF EXISTS trigger_sync_exchange_rate ON users;
DROP TRIGGER IF EXISTS sync_exchange_rate_on_insert ON users;
DROP TRIGGER IF EXISTS sync_exchange_rate_on_update ON users;

-- 4. Create INSERT Trigger
-- Trigger fires BEFORE INSERT on users table
-- Only applies when NEW.role = 'agent'
CREATE TRIGGER sync_exchange_rate_on_insert
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION public.sync_exchange_rate_logic();

-- 5. Create UPDATE Trigger
-- Trigger fires BEFORE UPDATE on users table
-- Only applies when NEW.role = 'agent'
CREATE TRIGGER sync_exchange_rate_on_update
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION public.sync_exchange_rate_logic();

-- 6. Validation Query (for testing)
-- Validation: Verify all agents have synchronized exchange rates
/*
SELECT id, email, role, taux_change, exchange_rate
FROM users
WHERE role = 'agent';
*/