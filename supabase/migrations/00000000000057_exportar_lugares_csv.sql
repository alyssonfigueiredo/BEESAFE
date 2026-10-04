-- Exportar lugares em CSV, pelo painel (04/10/2026, pedido do Alysson). admin_places (migration 39)
-- trava em 200 linhas por página, de propósito, pra tabela da tela — aqui não tem esse teto (até
-- 20.000 por chamada, respeitando os mesmos filtros de cidade/busca/status da tela de Lugares).
create or replace function public.admin_places_export(
  p_cidade integer default null, p_busca text default null, p_status text default null
) returns table (
  id uuid, nome text, categoria public.place_category, endereco text, cidade text, bairro text,
  lat double precision, lng double precision, status public.content_status, verificado boolean,
  avaliacoes integer, nota numeric, selo text, criado_em timestamptz
) language plpgsql stable security definer set search_path = public, extensions as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select l.id, l.name, l.category, l.address, c.name || ' · ' || c.state, n.name,
         st_y(l.location::geometry), st_x(l.location::geometry), l.status, l.verified,
         coalesce(s.rating_count, 0), s.score, s.badge, l.created_at
  from public.places l
  left join public.cities c on c.id = l.city_id
  left join public.neighborhoods n on n.id = l.neighborhood_id
  left join public.place_scores s on s.place_id = l.id
  where (p_cidade is null or l.city_id = p_cidade)
    and (p_status is null or l.status::text = p_status)
    and (v_busca is null or strpos(public.place_name_key(l.name), public.place_name_key(v_busca)) > 0)
  order by c.name, coalesce(s.rating_count, 0) desc, l.name
  limit 20000;
end $$;
revoke all on function public.admin_places_export(integer, text, text) from public, anon;
grant execute on function public.admin_places_export(integer, text, text) to authenticated;
