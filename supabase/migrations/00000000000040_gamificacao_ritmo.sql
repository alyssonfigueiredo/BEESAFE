-- Gamificação, ajuste depois do primeiro dia no ar (04/10/2026).
-- 1. O anel enchia rápido demais: com quase todo lugar sem nota, cada avaliação valia 2 gomos
--    (avaliação + "primeira do lugar") e uma conta da equipe completou os 48 no primeiro dia.
--    Agora cada semana acende no máximo 4 gomos e a primeira do lugar não soma (é a medalha Inaugurou).
-- 2. Figurinha e Famosinha mostravam 15/15 e 30/30 trancadas (faltava a trava das semanas). Quando as
--    avaliações já bastam, o progresso passa a contar as semanas. Toda medalha ganha 'unidade'.
-- Medalhas já desbloqueadas continuam (user_medals não muda).

create or replace function public.gami_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ratings int; v_weeks int; v_bairros int; v_cidades int; v_first int; v_fifth int;
  v_places int; v_photos int; v_msgs int;
  v_week_days int; v_weeks_lit int; v_extra int; v_consult int; v_support int;
  v_faiscas int; v_opened_boxes int; v_gomos int; v_gomos_semana int; v_cut jsonb; v_created timestamptz; v_abre boolean;
begin
  with r as (
    select pr.id, pr.place_id, pr.created_at, p.neighborhood_id, p.city_id
    from public.place_ratings pr join public.places p on p.id = pr.place_id
    where pr.user_id = p_user and pr.status = 'active' and p.status = 'active'
  )
  select count(*),
         count(distinct date_trunc('week', created_at at time zone 'America/Sao_Paulo')),
         count(distinct neighborhood_id),
         count(distinct city_id),
         count(*) filter (where not exists (
           select 1 from public.place_ratings o
           where o.place_id = r.place_id and o.status = 'active'
             and (o.created_at, o.id) < (r.created_at, r.id))),
         count(*) filter (where (
           select count(*) from public.place_ratings o
           where o.place_id = r.place_id and o.status = 'active'
             and (o.created_at, o.id) < (r.created_at, r.id)) = 4)
    into v_ratings, v_weeks, v_bairros, v_cidades, v_first, v_fifth
  from r;

  select count(*) into v_places from public.places where created_by = p_user and status = 'active';
  select count(*) into v_photos from public.place_photos
    where user_id = p_user and status = 'active' and review = 'aprovada';
  select count(*) into v_msgs from public.support_messages where created_by = p_user and status = 'active';

  select count(*) filter (where day >= date_trunc('week', public.irisa_today())::date),
         count(*) filter (where consulted),
         count(*) filter (where supported)
    into v_week_days, v_consult, v_support
  from public.user_days where user_id = p_user;

  select count(*) filter (where n >= 4), coalesce(sum(least(greatest(n - 4, 0), 3)), 0)
    into v_weeks_lit, v_extra
  from (select count(*) as n from public.user_days where user_id = p_user
        group by date_trunc('week', day)) w;

  v_faiscas := v_consult + v_support + v_extra;
  select count(*) into v_opened_boxes from public.user_boxes where user_id = p_user;
  -- Gomos: cada avaliação no ar, cada 5ª avaliação (a que acende o selo), cada lugar cadastrado e
  -- cada foto aprovada vale um ponto na semana em que aconteceu; cada semana acende no máximo 4 gomos.
  -- 48 gomos = pelo menos 12 semanas de contribuição. A primeira avaliação de um lugar não dá gomo a
  -- mais (já vira a medalha Inaugurou): com quase todo lugar sem nota, ela dobrava o ritmo.
  with ev as (
    select pr.created_at as em from public.place_ratings pr join public.places p on p.id = pr.place_id
     where pr.user_id = p_user and pr.status = 'active' and p.status = 'active'
    union all
    select pr.created_at from public.place_ratings pr join public.places p on p.id = pr.place_id
     where pr.user_id = p_user and pr.status = 'active' and p.status = 'active'
       and (select count(*) from public.place_ratings o
             where o.place_id = pr.place_id and o.status = 'active'
               and (o.created_at, o.id) < (pr.created_at, pr.id)) = 4
    union all
    select created_at from public.places where created_by = p_user and status = 'active'
    union all
    select coalesce(reviewed_at, created_at) from public.place_photos
     where user_id = p_user and status = 'active' and review = 'aprovada'
  ), sem as (
    select date_trunc('week', em at time zone 'America/Sao_Paulo')::date as semana, least(count(*), 4) as n
    from ev group by 1
  )
  select coalesce(sum(n), 0), coalesce(max(n) filter (where semana = date_trunc('week', public.irisa_today())::date), 0)
    into v_gomos, v_gomos_semana
  from sem;
  v_gomos := least(48, v_gomos);

  select value into v_cut from public.app_settings where key = 'abre_alas_ate';
  select created_at into v_created from public.profiles where id = p_user;
  v_abre := v_cut is null or jsonb_typeof(v_cut) = 'null'
            or v_created <= ((v_cut #>> '{}')::date + 1)::timestamptz;

  return jsonb_build_object(
    'gomos', v_gomos,
    'nivel', case when v_gomos = 0 then 0 else ceil(v_gomos / 8.0)::int end,
    'avaliacoes', v_ratings,
    'gomos_semana', v_gomos_semana,
    'gomos_semana_max', 4,
    'semana', jsonb_build_object('dias', v_week_days, 'acesa', v_week_days >= 4,
                                 'extra', least(greatest(v_week_days - 4, 0), 3)),
    'semanas_acesas', v_weeks_lit,
    'faiscas', jsonb_build_object('total', v_faiscas, 'rumo', v_faiscas % 10),
    'caixinhas', greatest(0, (v_faiscas / 10) + v_weeks_lit - v_opened_boxes),
    'medalhas', jsonb_build_array(
      jsonb_build_object('id', 'deu-o-nome', 'valor', least(v_ratings, 1), 'alvo', 1, 'ok', v_ratings >= 1, 'unidade', 'avaliações'),
      jsonb_build_object('id', 'deu-close', 'valor', least(v_ratings, 5), 'alvo', 5, 'ok', v_ratings >= 5, 'unidade', 'avaliações'),
      -- Com as avaliações feitas e faltando semana, o progresso passa a contar as semanas: nada de 15/15 trancada.
      case when v_ratings >= 15 and v_weeks < 3
        then jsonb_build_object('id', 'figurinha', 'valor', v_weeks, 'alvo', 3, 'ok', false, 'unidade', 'semanas')
        else jsonb_build_object('id', 'figurinha', 'valor', least(v_ratings, 15), 'alvo', 15, 'ok', v_ratings >= 15 and v_weeks >= 3, 'unidade', 'avaliações') end,
      case when v_ratings >= 30 and v_weeks < 4
        then jsonb_build_object('id', 'famosinha', 'valor', v_weeks, 'alvo', 4, 'ok', false, 'unidade', 'semanas')
        else jsonb_build_object('id', 'famosinha', 'valor', least(v_ratings, 30), 'alvo', 30, 'ok', v_ratings >= 30 and v_weeks >= 4, 'unidade', 'avaliações') end,
      jsonb_build_object('id', 'inaugurou', 'valor', least(v_first, 1), 'alvo', 1, 'ok', v_first >= 1),
      jsonb_build_object('id', 'acendeu-a-luz', 'valor', least(v_fifth, 1), 'alvo', 1, 'ok', v_fifth >= 1),
      jsonb_build_object('id', 'eu-conheco', 'valor', least(v_places, 1), 'alvo', 1, 'ok', v_places >= 1),
      jsonb_build_object('id', 'nome-na-lista', 'valor', least(v_bairros, 5), 'alvo', 5, 'unidade', 'bairros', 'ok', v_bairros >= 5),
      jsonb_build_object('id', 'mala-pronta', 'valor', least(v_cidades, 3), 'alvo', 3, 'unidade', 'cidades', 'ok', v_cidades >= 3),
      jsonb_build_object('id', 'bateu-ponto', 'valor', case when v_weeks_lit > 0 then 4 else least(v_week_days, 4) end, 'alvo', 4, 'ok', v_weeks_lit >= 1, 'unidade', 'dias'),
      jsonb_build_object('id', 'ombro-amigo', 'valor', least(v_msgs, 10), 'alvo', 10, 'unidade', 'mensagens', 'ok', v_msgs >= 10),
      jsonb_build_object('id', 'abre-alas', 'valor', case when v_abre then 1 else 0 end, 'alvo', 1, 'ok', v_abre)
    )
  );
end $$;
revoke all on function public.gami_stats(uuid) from public, anon, authenticated;
