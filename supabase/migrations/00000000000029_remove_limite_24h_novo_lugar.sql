-- App lançado em 01/10/2026: tirar a trava de 24h de conta nova para cadastrar lugar
-- (atrapalha gente se cadastrando e cadastrando o primeiro lugar no mesmo dia). O limite
-- de 5 lugares/dia por conta continua.
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer;
begin
  if tg_table_name = 'place_ratings'
     and exists (select 1 from public.rate_limit_exempt where user_id = auth.uid()) then
    return new;
  end if;

  v_limit := case tg_table_name
    when 'occurrences' then 5
    when 'place_ratings' then 50
    when 'place_photos' then 10
    when 'support_messages' then 20
    when 'places' then 5
    when 'content_reports' then 20
    else 50 end;

  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''24 hours''',
                 tg_table_name, tg_argv[0])
    into v_count using auth.uid();
  if v_count >= v_limit then
    raise exception 'Limite de % por dia atingido. Tente amanhã.', v_limit using errcode = 'P0002';
  end if;

  return new;
end $$;
