-- 18 · Perfil robusto (27/09/2026, achado no TestFlight: "atualizar apelido" falhando).
--
-- update_my_profile era `security invoker` e fazia só UPDATE: se a linha de profiles não existisse
-- (conta criada antes do gatilho, ou gatilho que falhou), o UPDATE mexia em zero linhas, não dava
-- erro e o apelido não era salvo. Agora a função cria a linha se faltar, valida o apelido e a
-- cidade, e só mexe em apelido e cidade (papel de moderação nunca muda por aqui).

-- 1) Quem não tem linha de perfil ganha uma.
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

-- 2) Salvar apelido e cidade padrão.
create or replace function public.update_my_profile(p_nickname text, p_default_city_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text := nullif(btrim(coalesce(p_nickname, '')), '');
  v_city integer := p_default_city_id;
begin
  if v_uid is null then
    raise exception 'Sua sessão expirou. Saia e entre de novo.' using errcode = '28000';
  end if;
  if v_nick is not null and char_length(v_nick) > 40 then
    raise exception 'O apelido pode ter no máximo 40 caracteres.' using errcode = '22001';
  end if;
  if v_city is not null and not exists (select 1 from public.cities where id = v_city) then
    v_city := null;
  end if;

  insert into public.profiles (id, nickname, default_city_id)
  values (v_uid, v_nick, v_city)
  on conflict (id) do update
    set nickname = excluded.nickname,
        default_city_id = excluded.default_city_id;
end
$$;

revoke all on function public.update_my_profile(text, integer) from public, anon;
grant execute on function public.update_my_profile(text, integer) to authenticated;

-- 3) Ler o próprio perfil garantindo que ele existe (o app usa no lugar do select direto).
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'Sua sessão expirou. Saia e entre de novo.' using errcode = '28000';
  end if;
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;
  select * into v_row from public.profiles where id = v_uid;
  return v_row;
end
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
