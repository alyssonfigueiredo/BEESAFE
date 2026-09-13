-- Fase 0: extensões base. Rodar via `supabase db push` ou no SQL editor do projeto.
create extension if not exists postgis schema extensions;
create extension if not exists pg_trgm;
create extension if not exists pg_cron;
create extension if not exists unaccent;
