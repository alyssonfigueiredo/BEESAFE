-- Tolerância na borda do município.
--
-- A malha do IBGE recorta corpos d'água e recua a linha de costa: a areia da praia, a Lagoa
-- Rodrigo de Freitas e a orla do Rio Vermelho ficam FORA do polígono do município. Com
-- st_contains puro, quem está na praia não conseguia registrar relato nem avaliar lugar, e o
-- app não descobria em que cidade a pessoa estava. O import de lugares do OSM bateu nisso em
-- Salvador (barracas de praia), no Rio (Bar Lagoa, hotel de Copacabana) e em João Pessoa.
--
-- Agora, quando o ponto não cai dentro de nenhum município, procura o mais próximo até 2 km e
-- usa esse. Dois quilômetros cobrem faixa de areia, lagoa e enseada sem alcançar o município
-- vizinho — e ponto realmente fora (outro país, meio do oceano) continua recusado.

create or replace function public.resolve_occurrence_area()
returns trigger language plpgsql set search_path = public, extensions as $$
declare pt geometry := new.location::geometry;
begin
  select id into new.city_id from public.cities where st_contains(geom, pt) limit 1;

  if new.city_id is null then
    -- st_dwithin em graus para usar o índice gist; ordena pela distância real em metros.
    select id into new.city_id
      from public.cities
      where st_dwithin(geom, pt, 0.02)
      order by st_distance(geom::geography, new.location)
      limit 1;
  end if;

  if new.city_id is null then
    raise exception 'Ponto fora de um município cadastrado' using errcode = 'P0001';
  end if;

  -- Bairro continua exigindo o ponto dentro: na areia não há bairro, e chutar o mais próximo
  -- sujaria o ranking por bairro. Fica nulo, que o app já trata.
  select id into new.neighborhood_id
    from public.neighborhoods where city_id = new.city_id and st_contains(geom, pt) limit 1;

  return new;
end $$;

create or replace function public.city_at(p_lat double precision, p_lng double precision)
returns table (id integer, name text, state char(2), lat double precision, lng double precision)
language sql stable security invoker as $$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326) as g)
  select c.id, c.name, c.state, st_y(c.centroid), st_x(c.centroid)
  from public.cities c, pt
  where st_dwithin(c.geom, pt.g, 0.02)
  -- Quem contém o ponto vem primeiro; só depois o mais próximo, para a praia cair na cidade dela.
  order by (not st_contains(c.geom, pt.g)), st_distance(c.geom::geography, pt.g::geography)
  limit 1;
$$;
