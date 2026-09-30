-- Avaliações: limite por usuário sobe de 10 para 50 em 24 h.
-- Mesma função da migration 24 (inclui place_photos; sem a tabela, o ramo só não é usado).
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer; v_age interval;
begin
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

  if tg_table_name = 'places' then
    select now() - created_at into v_age from public.profiles where id = auth.uid();
    if v_age < interval '24 hours' then
      raise exception 'Contas novas podem adicionar lugares após 24 horas.' using errcode = 'P0003';
    end if;
  end if;
  return new;
end $$;
