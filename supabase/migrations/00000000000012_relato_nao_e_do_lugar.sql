-- Migration 12: relato perto do lugar deixa de descontar da nota do lugar.
--
-- A violência acontece na rua, no beco, na praça, no ponto de ônibus. Descontar 0,5 da nota de um
-- bar porque houve uma agressão a 80 m dali transformava o relato em atributo do estabelecimento e
-- punia quem só tem o azar da vizinhança — o oposto do que o app quer dizer. Um registro de
-- violência é fato + local + apoio; se foi dentro ou perto de algo, isso não é nota de ninguém.
--
-- Continua descontando o relato que APONTA o lugar (occurrences.place_id): esse é sobre o lugar.
-- O relato no entorno segue visível como contexto de região (flagged, recent_occurrences) — quem
-- vai sair à noite merece saber —, só não vira mais penalidade.
--
-- Muda também o sentido de recent_high_occurrences: passa a contar só os graves que apontam este
-- lugar, para a ficha não dizer "a nota já desconta isso" sobre algo que não desconta mais.

create or replace function public.compute_place_score(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_loc geography; v_city integer; v_cat public.place_category;
  v_sum numeric; v_wsum numeric; v_count integer; v_sd numeric;
  v_welcome numeric; v_affection numeric; v_restroom numeric; v_crowd numeric;
  v_occ integer; v_high integer; v_site integer; v_site_recent integer;
  v_prior numeric; v_score numeric; v_raw numeric; v_badge text;
  m constant numeric := 5; -- força do prior: cinco avaliações de "cidade média"
begin
  select location, city_id, category into v_loc, v_city, v_cat
  from public.places where id = p_place_id;

  select
    sum(r.overall * r.w), sum(r.w), count(*), stddev_samp(r.overall),
    sum(r.welcome * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0),
    sum(r.affection * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0),
    sum(r.restroom * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0),
    sum(r.crowd * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0)
  into v_sum, v_wsum, v_count, v_sd, v_welcome, v_affection, v_restroom, v_crowd
  from (
    select overall, welcome, affection, restroom, crowd,
           power(0.5, extract(epoch from (now() - updated_at)) / (180 * 86400)) as w
    from public.place_ratings
    where place_id = p_place_id and status = 'active' and overall is not null
  ) r;

  -- Entorno: só para contexto na ficha e no cartão. Não entra na conta da nota.
  select count(*)
  into v_occ
  from public.occurrences
  where status = 'active'
    and occurrence_date >= current_date - 180
    and (place_id = p_place_id or st_dwithin(location, v_loc, 100));

  -- Relatos que apontam este lugar: estes, sim, são sobre o lugar.
  select count(*) filter (where severity = 'alta'),
         count(*) filter (where occurrence_date >= current_date - 30)
  into v_site, v_site_recent
  from public.occurrences
  where status = 'active' and place_id = p_place_id and occurrence_date >= current_date - 180;

  v_high := coalesce(v_site, 0);

  if v_count > 0 then
    v_prior := public.rating_prior(v_city, v_cat);
    -- média bayesiana: dois votos 5 não viram o topo da cidade
    v_raw := v_sum / nullif(v_wsum, 0);
    v_score := (m * v_prior + v_sum) / (m + v_wsum);
    -- Só o que aponta o lugar desconta. Mesmo peso de antes para esse caso (era 0,5 + 0,5).
    v_score := greatest(1.0, v_score - 1.0 * coalesce(v_site, 0));
  end if;

  -- Assimetria proposital: o elogio usa o score encolhido (difícil de conquistar), o alerta
  -- usa a média crua (cinco pessoas dizendo que foi ruim já bastam para avisar).
  v_badge := case
    when v_count < 5 then 'poucas'
    when coalesce(v_site_recent, 0) > 0 or v_score < 2.5 or v_raw < 2.5 then 'atencao'
    when coalesce(v_sd, 0) > 1.3 then 'dividido'
    when v_score >= 4.3 then 'acolhedor'
    when v_score >= 3.8 then 'bem'
    else null
  end;

  insert into public.place_scores (
    place_id, score, rating_count, recent_occurrences, recent_high_occurrences, flagged,
    score_welcome, score_affection, score_restroom, score_crowd, rating_stddev,
    recent_on_site, badge, updated_at)
  values (
    p_place_id, round(v_score, 2), coalesce(v_count, 0), coalesce(v_occ, 0), coalesce(v_high, 0),
    coalesce(v_occ, 0) > 0,
    round(v_welcome, 2), round(v_affection, 2), round(v_restroom, 2), round(v_crowd, 2),
    round(v_sd, 2), coalesce(v_site_recent, 0), v_badge, now())
  on conflict (place_id) do update set
    score = excluded.score, rating_count = excluded.rating_count,
    recent_occurrences = excluded.recent_occurrences,
    recent_high_occurrences = excluded.recent_high_occurrences,
    flagged = excluded.flagged,
    score_welcome = excluded.score_welcome, score_affection = excluded.score_affection,
    score_restroom = excluded.score_restroom, score_crowd = excluded.score_crowd,
    rating_stddev = excluded.rating_stddev, recent_on_site = excluded.recent_on_site,
    badge = excluded.badge, updated_at = now();
end $$;

-- Recalcula todo mundo que já tem linha de score, para as notas antigas saírem da penalidade.
do $$
declare r record;
begin
  for r in select place_id from public.place_scores loop
    perform public.compute_place_score(r.place_id);
  end loop;
end $$;
