-- 001: Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";
-- pg_cron and vector may not be available on all Supabase tiers
-- create extension if not exists "pg_cron";
-- create extension if not exists "vector";
