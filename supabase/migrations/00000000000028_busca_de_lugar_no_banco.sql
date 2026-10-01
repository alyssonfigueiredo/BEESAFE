-- A aba Lugares carregava 1.000 lugares da cidade e filtrava a busca no celular. Funcionava
-- com 256 lugares em Curitiba; depois do Overture nas 27 capitais (154 mil lugares, ~10.700 só
-- em Curitiba) o lote de 1.000 vem sem ordem nenhuma, e o que não cai nele não existe para o
-- app: lugar recém-cadastrado some da lista, da busca e do mapa, e as avaliações somem junto
-- porque a ficha nunca aparece.
--
-- A busca passa a ser no banco, por nome, tolerante a acento e caixa (mesma chave que o
-- anti-duplicata usa). setof public_places: a função acompanha a view se ela mudar.
create or replace function public.search_places(
  p_city_id integer,
  p_termo text,
  p_limit integer default 200
)
returns setof public.public_places
language sql stable security definer set search_path = public, extensions as $$
  select *
  from public.public_places
  where city_id = p_city_id
    and public.place_name_key(name) like '%' || public.place_name_key(p_termo) || '%'
  order by rating_count desc nulls last, created_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

revoke all on function public.search_places(integer, text, integer) from public, anon;
grant execute on function public.search_places(integer, text, integer) to authenticated;
