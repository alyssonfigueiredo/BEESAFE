-- Irise: assistente de descoberta em chat, sem personagem (04/10/2026).
-- Três camadas, nesta ordem: 1) chips e um roteador de palavras-chave no app, sem IA nenhuma;
-- 2) só quando o texto livre não casa com o roteador, a Edge Function irise-intent manda pro
-- Groq ou Gemini (IRISE_PROVIDER) e volta só a intenção estruturada (categorias, "sem nota"),
-- nunca um lugar; 3) esta RPC busca de verdade em public_places — a IA nunca inventa nome, nota
-- ou endereço, só escolhe o filtro. O resultado é sempre o mesmo cartão de lugar de sempre.

create or replace function public.irise_suggest_places(
  p_city_id integer,
  p_categories public.place_category[] default null,
  p_sem_nota boolean default false,
  p_limit integer default 3
)
returns table (
  id uuid, name text, category public.place_category, neighborhood text,
  score numeric, rating_count integer, flagged boolean, badge text, area_level text,
  score_welcome numeric, score_affection numeric, score_restroom numeric, score_crowd numeric,
  photo_name text, photo_author text, photo_author_uri text,
  photo_url text, photo_source text, photo_credit text, photo_credit_uri text
)
language sql stable security invoker as $$
  select id, name, category, neighborhood, score, rating_count, flagged, badge, area_level,
         score_welcome, score_affection, score_restroom, score_crowd,
         photo_name, photo_author, photo_author_uri, photo_url, photo_source, photo_credit, photo_credit_uri
  from public.public_places
  where city_id = p_city_id
    and (p_categories is null or category = any(p_categories))
    and coalesce(badge, '') <> 'atencao'
    and (
      (not p_sem_nota and score is not null)
      or (p_sem_nota and score is null)
    )
  order by (case when p_sem_nota then random() else 0 end),
           score desc nulls last,
           rating_count desc nulls last
  limit least(greatest(coalesce(p_limit, 3), 1), 10);
$$;
revoke all on function public.irise_suggest_places(integer, public.place_category[], boolean, integer) from public, anon;
grant execute on function public.irise_suggest_places(integer, public.place_category[], boolean, integer) to authenticated;
