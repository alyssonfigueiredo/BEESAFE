-- Stubs mínimos do Supabase (auth, realtime, roles) para rodar as migrations num Postgres comum com PostGIS.
create schema auth;
create schema extensions;
alter database irisa set search_path = public, extensions;  -- igual ao Supabase
create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now(), last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin; create role authenticated nologin;
create schema realtime;
create table realtime.messages (id bigserial primary key, topic text, event text, payload jsonb, private boolean, inserted_at timestamptz default now());
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ insert into realtime.messages (topic, event, payload, private) values (topic, event, payload, private) $$;
create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
alter table realtime.messages enable row level security;
create role service_role nologin;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
alter table storage.objects enable row level security;
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null) returns uuid language sql as $$ insert into vault.secrets (name, secret) values (new_name, new_secret) returning id $$;
create extension if not exists pgcrypto with schema extensions;  -- no Supabase já vem instalado
