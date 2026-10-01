-- 1) Contas sem limite diário de avaliação (as do Alysson e do Leandro, que avaliam os primeiros
--    lugares em massa). Tabela sem policy nenhuma: o app não lê nem escreve, só o banco consulta.
--    Entra pelo SQL Editor, sem e-mail no repositório:
--      insert into public.rate_limit_exempt (user_id, note)
--      select id, 'motivo' from auth.users where email = '...' on conflict do nothing;
create table if not exists public.rate_limit_exempt (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.rate_limit_exempt enable row level security;

create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer; v_age interval;
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

  if tg_table_name = 'places' then
    select now() - created_at into v_age from public.profiles where id = auth.uid();
    if v_age < interval '24 hours' then
      raise exception 'Contas novas podem adicionar lugares após 24 horas.' using errcode = 'P0003';
    end if;
  end if;
  return new;
end $$;

-- 2) Chave do cron do photo-check só no Vault. A função confere pela RPC abaixo (só a chave de
--    serviço chama), então não existe mais o secret PHOTO_CHECK_SECRET para colar na mão.
select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'photo_check_secret')
where not exists (select 1 from vault.secrets where name = 'photo_check_secret');

create or replace function public.photo_check_autorizado(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_secret, '') <> ''
     and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'photo_check_secret');
$$;
revoke all on function public.photo_check_autorizado(text) from public, anon, authenticated;
grant execute on function public.photo_check_autorizado(text) to service_role;
