-- Descrição visível e filtrável no painel de Lugares (05/10/2026, pedido do Alysson): depois do
-- import em massa por CSV, ele precisa ver quem já tem description e exportar só quem ainda não
-- tem, pra mandar pro próximo lote de pesquisa. Muda a forma de retorno de admin_places e
-- admin_places_export (precisa dropar antes de recriar).

drop function if exists public.admin_places(integer, text, text, integer, integer);
create function public.admin_places(
  p_cidade integer default null, p_busca text default null, p_status text default null,
  p_limite integer default 50, p_offset integer default 0, p_descricao text default null
) returns table (
  id uuid, nome text, categoria public.place_category, endereco text, cidade text, cidade_id integer, bairro text,
  lat double precision, lng double precision, status public.content_status, verificado boolean,
  avaliacoes integer, nota numeric, selo text, foto_url text, foto_origem text, relevancia smallint,
  descricao text, criado_em timestamptz, total bigint
) language plpgsql stable security definer set search_path = public, extensions as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select l.id, l.name, l.category, l.address, c.name || ' · ' || c.state, l.city_id, n.name,
         st_y(l.location::geometry), st_x(l.location::geometry), l.status, l.verified,
         coalesce(s.rating_count, 0), s.score, s.badge, l.photo_url, l.photo_source, l.prominence,
         l.description, l.created_at, count(*) over ()
  from public.places l
  left join public.cities c on c.id = l.city_id
  left join public.neighborhoods n on n.id = l.neighborhood_id
  left join public.place_scores s on s.place_id = l.id
  where (p_cidade is null or l.city_id = p_cidade)
    and (p_status is null or l.status::text = p_status)
    and (p_descricao is null or (p_descricao = 'com') = (l.description is not null))
    and (v_busca is null or strpos(public.place_name_key(l.name), public.place_name_key(v_busca)) > 0)
  order by coalesce(s.rating_count, 0) desc, l.prominence desc, l.created_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.admin_places(integer, text, text, integer, integer, text) from public, anon;
grant execute on function public.admin_places(integer, text, text, integer, integer, text) to authenticated;

drop function if exists public.admin_places_export(integer, text, text);
create function public.admin_places_export(
  p_cidade integer default null, p_busca text default null, p_status text default null, p_descricao text default null
) returns table (
  id uuid, nome text, categoria public.place_category, endereco text, cidade text, bairro text,
  lat double precision, lng double precision, status public.content_status, verificado boolean,
  avaliacoes integer, nota numeric, selo text, descricao text, criado_em timestamptz
) language plpgsql stable security definer set search_path = public, extensions as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select l.id, l.name, l.category, l.address, c.name || ' · ' || c.state, n.name,
         st_y(l.location::geometry), st_x(l.location::geometry), l.status, l.verified,
         coalesce(s.rating_count, 0), s.score, s.badge, l.description, l.created_at
  from public.places l
  left join public.cities c on c.id = l.city_id
  left join public.neighborhoods n on n.id = l.neighborhood_id
  left join public.place_scores s on s.place_id = l.id
  where (p_cidade is null or l.city_id = p_cidade)
    and (p_status is null or l.status::text = p_status)
    and (p_descricao is null or (p_descricao = 'com') = (l.description is not null))
    and (v_busca is null or strpos(public.place_name_key(l.name), public.place_name_key(v_busca)) > 0)
  order by c.name, coalesce(s.rating_count, 0) desc, l.name
  limit 20000;
end $$;
revoke all on function public.admin_places_export(integer, text, text, text) from public, anon;
grant execute on function public.admin_places_export(integer, text, text, text) to authenticated;

drop function if exists public.admin_place_save(uuid, text, public.place_category, text, double precision, double precision, public.content_status, boolean);
create function public.admin_place_save(
  p_id uuid, p_nome text, p_categoria public.place_category, p_endereco text,
  p_lat double precision, p_lng double precision, p_status public.content_status default 'active',
  p_verificado boolean default false, p_descricao text default null
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform public.admin_guard(false);
  insert into public.rate_limit_exempt (user_id) values (auth.uid()) on conflict do nothing;
  if p_id is null then
    insert into public.places (name, category, address, location, status, verified, description)
    values (btrim(p_nome), p_categoria, nullif(btrim(coalesce(p_endereco, '')), ''),
            st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, coalesce(p_status, 'active'),
            coalesce(p_verificado, false), nullif(btrim(coalesce(p_descricao, '')), ''))
    returning id into v_id;
  else
    update public.places
       set name = btrim(p_nome), category = p_categoria,
           address = nullif(btrim(coalesce(p_endereco, '')), ''),
           location = case when st_equals(location::geometry, st_setsrid(st_makepoint(p_lng, p_lat), 4326))
                           then location else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
           status = coalesce(p_status, status), verified = coalesce(p_verificado, verified),
           description = nullif(btrim(coalesce(p_descricao, '')), '')
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Lugar não encontrado'; end if;
  end if;
  return v_id;
end $$;
revoke all on function public.admin_place_save(uuid, text, public.place_category, text, double precision, double precision, public.content_status, boolean, text) from public, anon;
grant execute on function public.admin_place_save(uuid, text, public.place_category, text, double precision, double precision, public.content_status, boolean, text) to authenticated;
