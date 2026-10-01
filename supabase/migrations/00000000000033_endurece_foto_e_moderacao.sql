-- Migration 33: endurece a foto de usuário e a moderação.
--
-- 1. place_photos: a RLS só olhava user_id, então a pessoa podia se auto-aprovar (review =
--    'aprovada') ou reativar o que a moderação escondeu. Trigger força os campos de moderação.
-- 2. place_ratings: o autor podia mudar o próprio `status` (desescondendo avaliação moderada).
-- 3. A foto do Mapillary/Google se perdia quando a de um usuário entrava e saía: agora a origem
--    fica em colunas `origin_photo_*` e volta quando não há foto de usuário liberada.
-- 4. set_content_status/moderation_queue passam a conhecer 'photo' (denúncia de foto).
-- 5. search_places: % _ e \ eram curingas no like; termo vazio devolvia a cidade inteira.
-- 6. tester_signup: quem se reinscreve em outra plataforma volta para a fila de boas-vindas.
--
-- "Quem é restrito": os triggers abaixo rodam como invoker, então current_user é o papel real
-- (authenticated/anon numa chamada do app). Funções security definer (moderar_foto, moderate,
-- on_report_created) e a service_role (Edge Function photo-check) aparecem como outro papel e
-- passam livres; um usuário comum só passa se is_moderator().

-- ---------- 1. place_photos ----------
create or replace function public.place_photos_guard()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_moderator() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.review := 'pendente';
    new.status := 'active';
    new.review_note := null;
    new.reviewed_at := null;
  else
    -- Dono e lugar não mudam; moderação não é do autor.
    new.user_id := old.user_id;
    new.place_id := old.place_id;
    new.created_at := old.created_at;
    new.review := old.review;
    new.status := old.status;
    new.review_note := old.review_note;
    new.reviewed_at := old.reviewed_at;
    -- Trocou a imagem: a liberação anterior não vale para a nova.
    if new.url is distinct from old.url or new.path is distinct from old.path then
      new.review := 'pendente';
      new.review_note := null;
      new.reviewed_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists place_photos_guard_trg on public.place_photos;
create trigger place_photos_guard_trg
  before insert or update on public.place_photos
  for each row execute function public.place_photos_guard();

-- ---------- 2. place_ratings ----------
create or replace function public.place_ratings_guard()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.status is distinct from old.status
     and current_user in ('authenticated', 'anon') and not public.is_moderator() then
    new.status := old.status;
  end if;
  return new;
end $$;

drop trigger if exists place_ratings_guard_trg on public.place_ratings;
create trigger place_ratings_guard_trg
  before update on public.place_ratings
  for each row execute function public.place_ratings_guard();

-- ---------- 3. origem da foto do lugar ----------
alter table public.places
  add column if not exists origin_photo_url text,
  add column if not exists origin_photo_source text
    check (origin_photo_source in ('mapillary', 'usuario', 'wikimedia')),
  add column if not exists origin_photo_credit text,
  add column if not exists origin_photo_credit_uri text,
  add column if not exists origin_photo_at timestamptz;

comment on column public.places.origin_photo_url is
  'Foto de origem (Mapillary/Wikimedia) guardada enquanto uma foto de usuário ocupa photo_url. Volta quando a do usuário sai.';

-- Aplica a foto de usuário liberada mais recente; sem ela, devolve a de origem.
create or replace function public.refresh_place_photo(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v public.place_photos;
begin
  perform set_config('irisa.photo_refresh', '1', true);

  select * into v from public.place_photos
  where place_id = p_place_id and status = 'active' and review = 'aprovada'
  order by created_at desc limit 1;

  if found then
    update public.places
    set origin_photo_url = case when photo_source is distinct from 'usuario' and photo_url is not null
                                then photo_url else origin_photo_url end,
        origin_photo_source = case when photo_source is distinct from 'usuario' and photo_url is not null
                                then photo_source else origin_photo_source end,
        origin_photo_credit = case when photo_source is distinct from 'usuario' and photo_url is not null
                                then photo_credit else origin_photo_credit end,
        origin_photo_credit_uri = case when photo_source is distinct from 'usuario' and photo_url is not null
                                then photo_credit_uri else origin_photo_credit_uri end,
        origin_photo_at = case when photo_source is distinct from 'usuario' and photo_url is not null
                                then photo_at else origin_photo_at end,
        photo_url = v.url, photo_source = 'usuario',
        photo_credit = 'Foto de quem avaliou', photo_credit_uri = null,
        photo_at = v.created_at
    where id = p_place_id;
  else
    update public.places
    set photo_url = origin_photo_url, photo_source = origin_photo_source,
        photo_credit = origin_photo_credit, photo_credit_uri = origin_photo_credit_uri,
        photo_at = origin_photo_at,
        origin_photo_url = null, origin_photo_source = null, origin_photo_credit = null,
        origin_photo_credit_uri = null, origin_photo_at = null
    where id = p_place_id and photo_source = 'usuario';
  end if;

  perform set_config('irisa.photo_refresh', '0', true);
end $$;

-- Escrita externa (scripts/mapillary-photos.mjs) sobre um lugar com foto de usuário: a do
-- usuário fica no ar e a nova vira a origem.
create or replace function public.places_keep_user_photo()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if old.photo_source = 'usuario'
     and new.photo_url is distinct from old.photo_url
     and coalesce(current_setting('irisa.photo_refresh', true), '0') <> '1' then
    new.origin_photo_url := new.photo_url;
    new.origin_photo_source := new.photo_source;
    new.origin_photo_credit := new.photo_credit;
    new.origin_photo_credit_uri := new.photo_credit_uri;
    new.origin_photo_at := new.photo_at;
    new.photo_url := old.photo_url;
    new.photo_source := old.photo_source;
    new.photo_credit := old.photo_credit;
    new.photo_credit_uri := old.photo_credit_uri;
    new.photo_at := old.photo_at;
  end if;
  return new;
end $$;

drop trigger if exists places_keep_user_photo_trg on public.places;
create trigger places_keep_user_photo_trg
  before update of photo_url, photo_source on public.places
  for each row execute function public.places_keep_user_photo();

-- Backfill seguro: lugares marcados com foto de usuário que já não tem nenhuma liberada
-- (foto escondida/recusada antes desta migration). A origem antiga já se perdeu e fica vazia;
-- o refresh só limpa o que é de usuário e nunca toca em lugar sem foto de usuário.
do $$
declare r record;
begin
  for r in select id from public.places where photo_source = 'usuario' loop
    perform public.refresh_place_photo(r.id);
  end loop;
end $$;

-- ---------- 4. moderação de foto ----------
create or replace function public.set_content_status(p_type public.report_target, p_id uuid, p_status public.content_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  case p_type
    when 'occurrence' then update public.occurrences set status = p_status where id = p_id;
    when 'place' then update public.places set status = p_status where id = p_id;
    when 'rating' then update public.place_ratings set status = p_status where id = p_id;
    when 'message' then update public.support_messages set status = p_status where id = p_id;
    when 'photo' then update public.place_photos set status = p_status where id = p_id;
  end case;
end $$;

-- Mesma fila da migration 7 com o ramo de foto. Nunca expõe o autor (sem user_id).
create or replace function public.moderation_queue(p_limit integer default 50)
returns table (
  target_type public.report_target, target_id uuid, reports bigint, first_reported timestamptz,
  reasons text[], summary text, current_status public.content_status
)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.is_moderator() then raise exception 'Somente moderação' using errcode = '42501'; end if;
  return query
  select r.target_type, r.target_id, count(*) as reports, min(r.created_at) as first_reported,
         array_agg(r.reason order by r.created_at) as reasons,
         case r.target_type
           when 'occurrence' then (
             select o.type::text
                    || coalesce(' · em ' || (select p.name from public.places p where p.id = o.place_id), '')
                    || ' · ' || coalesce(left(o.description, 120), '')
             from public.occurrences o where o.id = r.target_id)
           when 'place' then (select p.name from public.places p where p.id = r.target_id)
           when 'rating' then (
             select coalesce(pr.overall::text, pr.stars::text) || '/5 ' || coalesce(left(pr.comment, 120), '')
             from public.place_ratings pr where pr.id = r.target_id)
           when 'message' then (select left(m.content, 120) from public.support_messages m where m.id = r.target_id)
           when 'photo' then (
             select 'foto · em ' || coalesce(p.name, '?') || ' · ' || ph.url
             from public.place_photos ph left join public.places p on p.id = ph.place_id
             where ph.id = r.target_id)
         end as summary,
         case r.target_type
           when 'occurrence' then (select o.status from public.occurrences o where o.id = r.target_id)
           when 'place' then (select p.status from public.places p where p.id = r.target_id)
           when 'rating' then (select pr.status from public.place_ratings pr where pr.id = r.target_id)
           when 'message' then (select m.status from public.support_messages m where m.id = r.target_id)
           when 'photo' then (select ph.status from public.place_photos ph where ph.id = r.target_id)
         end as current_status
  from public.content_reports r
  where r.status = 'open'
  group by r.target_type, r.target_id
  order by count(*) desc, min(r.created_at)
  limit p_limit;
end $$;
-- moderate() (migration 5) só chama set_content_status e atualiza content_reports: já serve a foto.

-- ---------- 5. search_places ----------
-- strpos compara literal (sem curinga). Termo vazio não devolve nada.
create or replace function public.search_places(
  p_city_id integer,
  p_termo text,
  p_limit integer default 200
)
returns setof public.public_places
language sql stable security definer set search_path = public, extensions as $$
  select pp.*
  from public.public_places pp
  where pp.city_id = p_city_id
    and char_length(public.place_name_key(p_termo)) > 0
    and strpos(public.place_name_key(pp.name), public.place_name_key(p_termo)) > 0
  order by pp.rating_count desc nulls last, pp.created_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

revoke all on function public.search_places(integer, text, integer) from public, anon;
grant execute on function public.search_places(integer, text, integer) to authenticated;

-- ---------- 6. tester_signup ----------
-- Trocar de plataforma é um pedido novo: precisa ser adicionado na loja certa e receber o e-mail certo.
create or replace function public.tester_signup(p_email text, p_platform text default 'android')
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_platform text := case when p_platform = 'ios' then 'ios' else 'android' end;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'E-mail inválido' using errcode = 'P0010';
  end if;
  if (select count(*) from public.tester_signups where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Muitas inscrições agora. Tente de novo em alguns minutos.' using errcode = 'P0011';
  end if;
  insert into public.tester_signups (email, platform) values (v_email, v_platform)
  on conflict (email) do update
    set platform = excluded.platform,
        welcomed_at = case when public.tester_signups.platform is distinct from excluded.platform
                           then null else public.tester_signups.welcomed_at end,
        added_at = case when public.tester_signups.platform is distinct from excluded.platform
                        then null else public.tester_signups.added_at end;
  return 'ok';
end $$;

revoke all on function public.tester_signup(text, text) from public;
grant execute on function public.tester_signup(text, text) to anon, authenticated;
