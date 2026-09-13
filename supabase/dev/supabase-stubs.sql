-- Stubs mínimos do Supabase (auth, realtime, roles) para rodar as migrations num Postgres comum com PostGIS.
create schema auth;
create schema extensions;
alter database irisa set search_path = public, extensions;  -- igual ao Supabase
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin; create role authenticated nologin;
create schema realtime;
create table realtime.messages (id bigserial primary key, topic text, event text, payload jsonb, private boolean, inserted_at timestamptz default now());
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ insert into realtime.messages (topic, event, payload, private) values (topic, event, payload, private) $$;
create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
alter table realtime.messages enable row level security;
