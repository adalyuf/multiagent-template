-- Migration: Add index on anomalies.detected_at
--
-- For NEW deployments: this index is created automatically via
-- Base.metadata.create_all() because the column is declared with index=True.
--
-- For EXISTING deployments with data already in the anomalies table,
-- run this script manually to add the index without locking writes.
-- CONCURRENTLY allows reads/writes to continue during index build.
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Run this directly via psql or an admin connection, not inside BEGIN/COMMIT.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_anomalies_detected_at
    ON anomalies (detected_at);
