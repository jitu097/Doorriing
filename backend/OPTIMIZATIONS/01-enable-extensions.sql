-- ============================================================================
-- PHASE 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================
-- Run this first in Supabase SQL Editor

-- Enable trigram extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions are enabled
SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'pgcrypto');
