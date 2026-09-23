-- Migration 10: impede lugares duplicados criados pelo usuário.
-- Sem isso, "Bar do Gato", "bar do gato" e "Bar do Gatoo" viram três fichas no mesmo quarteirão
-- e a avaliação da comunidade se dilui entre elas.

-- Comparação tolerante a acento e caixa. Stable (unaccent não é immutable): serve em consulta,
-- não em índice — o índice trigram do nome cru continua filtrando o grosso.
create or replace function public.place_name_key(p_name text)
returns text language sql stable set search_path = public, extensions as $$
  select lower(unaccent(btrim(coalesce(p_name, ''))));
$$;

-- Candidatos parecidos perto de um ponto. O app chama antes de enviar, para oferecer
-- o lugar que já existe em vez de criar outro.
create or replace function public.places_similar(
  p_name text,
  p_lat double precision,
  p_lng double precision
)
returns table (
  id uuid,
  name text,
  category public.place_category,
  address text,
  neighborhood text,
  distance_m double precision,
  semelhanca real
)
language sql stable security definer set search_path = public, extensions as $$
  with pt as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  )
  select p.id, p.name, p.category, p.address, n.name,
         st_distance(p.location, pt.g),
         similarity(public.place_name_key(p.name), public.place_name_key(p_name))
  from public.places p
  cross join pt
  left join public.neighborhoods n on n.id = p.neighborhood_id
  where p.status = 'active'
    and st_dwithin(p.location, pt.g, 300)
    and similarity(public.place_name_key(p.name), public.place_name_key(p_name)) > 0.3
  order by 7 desc, 6
  limit 5;
$$;

revoke all on function public.places_similar(text, double precision, double precision) from anon;
grant execute on function public.places_similar(text, double precision, double precision) to authenticated;

-- Barreira no banco: o aviso na tela é conselho, isto é regra. Vale para quem ignorar o aviso,
-- para duas pessoas cadastrando o mesmo bar ao mesmo tempo e para qualquer cliente futuro.
create or replace function public.block_duplicate_place()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_name text; v_dist double precision;
begin
  select p.name, st_distance(p.location, new.location)
    into v_name, v_dist
  from public.places p
  where p.status = 'active'
    and p.id is distinct from new.id
    and st_dwithin(p.location, new.location, 150)
    and similarity(public.place_name_key(p.name), public.place_name_key(new.name)) > 0.6
  order by st_distance(p.location, new.location)
  limit 1;

  if v_name is not null then
    raise exception 'Já existe "%" a % m daqui. Avalie esse lugar em vez de criar outro.',
      v_name, round(v_dist) using errcode = 'P0004';
  end if;
  return new;
end $$;

-- Nome começa com "places_b" para rodar antes de places_rate_limit e places_resolve_area
-- (o Postgres dispara triggers do mesmo momento em ordem alfabética): o erro mais útil vem primeiro.
drop trigger if exists places_block_duplicate on public.places;
create trigger places_block_duplicate
  before insert on public.places
  for each row execute function public.block_duplicate_place();
