-- Supabase concede isso por padrão em public
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant usage on schema realtime to anon, authenticated;
grant select on realtime.messages to anon, authenticated;
