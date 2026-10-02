-- O "Na Feira Bar" de Curitiba virou duas fichas: a do Overture, com o endereço antigo (Rua Padre
-- Anchieta), e a que o Leandro cadastrou na porta do bar (Alameda Princesa Izabel), 3,1 km adiante.
-- A trava de 150 m não vê isso: bar que muda de endereço fica a quilômetros do registro velho.
-- Ficha duplicada é o pior resultado possível aqui — a nota da comunidade racha entre as duas e
-- nenhuma chega às 5 avaliações do selo.
--
-- O aviso da tela passa a olhar a cidade inteira, não só os 300 m. Perto, nome parecido já basta.
-- Longe, o nome tem que ser bem parecido, senão "Bar do João" casaria com meia Curitiba.
--
-- A BARREIRA do banco (block_duplicate_place, 150 m) fica como está de propósito: rede com duas
-- lojas na mesma cidade é legítima, e recusar o cadastro pelo nome a quilômetros de distância
-- impediria gente de cadastrar lugar de verdade. Longe é conselho; perto é regra.
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
  ),
  cidade as (select id from public.city_at(p_lat, p_lng))
  select p.id, p.name, p.category, p.address, n.name,
         st_distance(p.location, pt.g),
         similarity(public.place_name_key(p.name), public.place_name_key(p_name))
  from public.places p
  cross join pt
  left join public.neighborhoods n on n.id = p.neighborhood_id
  where p.status = 'active'
    and (
      (
        st_dwithin(p.location, pt.g, 300)
        and similarity(public.place_name_key(p.name), public.place_name_key(p_name)) > 0.3
      )
      or (
        p.city_id = (select id from cidade)
        and similarity(public.place_name_key(p.name), public.place_name_key(p_name)) > 0.55
      )
    )
  order by 7 desc, 6
  limit 5;
$$;

revoke all on function public.places_similar(text, double precision, double precision) from anon;
grant execute on function public.places_similar(text, double precision, double precision) to authenticated;
