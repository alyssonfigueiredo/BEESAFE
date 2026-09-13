-- Fase 0: extensões base. Rodar via `supabase db push` ou no SQL editor do projeto.
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pg_cron;
