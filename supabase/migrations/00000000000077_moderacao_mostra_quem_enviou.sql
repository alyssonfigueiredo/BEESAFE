-- Quem cadastra lugar e quem manda foto passa a aparecer na moderação (13/10/2026, pedido do
-- Leandro): até aqui `fotos_para_moderar` e `admin_places` escondiam o autor de propósito (só
-- relato continua sem autor — é anônimo por natureza). Avaliação e mural já mostram o apelido pra
-- quem modera desde a migration 39 (`admin_ratings`/`admin_messages`); isso só estende o mesmo
-- padrão pra lugar e foto. Precisa dropar `admin_places`/`admin_places_export` pra mudar a lista
-- de colunas (mesma trava da migration 61).

drop function if exists public.admin_places(integer, text, text, integer, integer, text);
create function public.admin_places(
  p_cidade integer default null, p_busca text default null, p_status text default null,
  p_limite integer default 50, p_offset integer default 0, p_descricao text default null
) returns table (
  id uuid, nome text, categoria public.place_category, endereco text, cidade text, cidade_id integer, bairro text,
  lat double precision, lng double precision, status public.content_status, verificado boolean,
  avaliacoes integer, nota numeric, selo text, foto_url text, foto_origem text, relevancia smallint,
  descricao text, criado_em timestamptz, criado_por text, total bigint
) language plpgsql stable security definer set search_path = public, extensions as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select l.id, l.name, l.category, l.address, c.name || ' · ' || c.state, l.city_id, n.name,
         st_y(l.location::geometry), st_x(l.location::geometry), l.status, l.verified,
         coalesce(s.rating_count, 0), s.score, s.badge, l.photo_url, l.photo_source, l.prominence,
         l.description, l.created_at, coalesce(pf.nickname, u.email::text), count(*) over ()
  from public.places l
  left join public.cities c on c.id = l.city_id
  left join public.neighborhoods n on n.id = l.neighborhood_id
  left join public.place_scores s on s.place_id = l.id
  left join public.profiles pf on pf.id = l.created_by
  left join auth.users u on u.id = l.created_by
  where (p_cidade is null or l.city_id = p_cidade)
    and (p_status is null or l.status::text = p_status)
    and (p_descricao is null or (p_descricao = 'com') = (l.description is not null))
    and (v_busca is null or strpos(public.place_name_key(l.name), public.place_name_key(v_busca)) > 0)
  order by coalesce(s.rating_count, 0) desc, l.prominence desc, l.created_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.admin_places(integer, text, text, integer, integer, text) from public, anon;
grant execute on function public.admin_places(integer, text, text, integer, integer, text) to authenticated;

drop function if exists public.admin_places_export(integer, text, text, text);
create function public.admin_places_export(
  p_cidade integer default null, p_busca text default null, p_status text default null, p_descricao text default null
) returns table (
  id uuid, nome text, categoria public.place_category, endereco text, cidade text, bairro text,
  lat double precision, lng double precision, status public.content_status, verificado boolean,
  avaliacoes integer, nota numeric, selo text, descricao text, criado_em timestamptz, criado_por text
) language plpgsql stable security definer set search_path = public, extensions as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select l.id, l.name, l.category, l.address, c.name || ' · ' || c.state, n.name,
         st_y(l.location::geometry), st_x(l.location::geometry), l.status, l.verified,
         coalesce(s.rating_count, 0), s.score, s.badge, l.description, l.created_at,
         coalesce(pf.nickname, u.email::text)
  from public.places l
  left join public.cities c on c.id = l.city_id
  left join public.neighborhoods n on n.id = l.neighborhood_id
  left join public.place_scores s on s.place_id = l.id
  left join public.profiles pf on pf.id = l.created_by
  left join auth.users u on u.id = l.created_by
  where (p_cidade is null or l.city_id = p_cidade)
    and (p_status is null or l.status::text = p_status)
    and (p_descricao is null or (p_descricao = 'com') = (l.description is not null))
    and (v_busca is null or strpos(public.place_name_key(l.name), public.place_name_key(v_busca)) > 0)
  order by c.name, coalesce(s.rating_count, 0) desc, l.name
  limit 20000;
end $$;
revoke all on function public.admin_places_export(integer, text, text, text) from public, anon;
grant execute on function public.admin_places_export(integer, text, text, text) to authenticated;

drop function if exists public.fotos_para_moderar(integer);
create function public.fotos_para_moderar(p_limit integer default 50)
returns table (id uuid, place_id uuid, place_name text, url text, review text, review_note text, created_at timestamptz, enviado_por text)
language sql stable security definer set search_path = public as $$
  select f.id, f.place_id, p.name, f.url, f.review, f.review_note, f.created_at,
         coalesce(pf.nickname, u.email::text)
  from public.place_photos f
  join public.places p on p.id = f.place_id
  left join public.profiles pf on pf.id = f.user_id
  left join auth.users u on u.id = f.user_id
  where public.is_moderator() and f.review in ('pendente', 'humano', 'recusada')
  order by (f.review = 'humano') desc, f.created_at
  limit p_limit;
$$;
revoke all on function public.fotos_para_moderar(integer) from anon, authenticated;
grant execute on function public.fotos_para_moderar(integer) to authenticated;
