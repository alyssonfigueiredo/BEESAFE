-- Segunda leva de conquistas (04/10/2026, pedido do Leandro): +20 medalhas, total 32.
-- 15 já estavam desenhadas no catálogo (docs/pingentes.js) e cabem nos dados que o app já guarda;
-- 5 são novas: Dona do Pedaço (5 lugares no mesmo bairro), Resenha Boa (10 avaliações com comentário de
-- 60+ letras), Cartógrafa (5 lugares cadastrados que outras pessoas avaliaram), Abraço Coletivo (20 reações
-- nas suas mensagens do mural) e Tem Opinião (respondeu a pergunta da semana em 4 semanas) — 15 + 5 = 20. "Ajudou" = pessoas que abriram a ficha depois da sua avaliação (migration 47).
-- Ficam de fora, por não ter dado: Favorita do Público, Serviu Tudo (não há desafios do dia) e Rede de
-- Apoio (não há convite). Regras de sempre: relato nunca conta, nada público, nada por horário ou região.
-- Quem já ganhou alguma medalha fica com ela; my_gamification só acrescenta.

-- Olho Vivo precisa saber em que dias a pessoa abriu a ficha de um bairro (só o dia, nunca qual bairro).
alter table public.user_days add column if not exists bairro boolean not null default false;

create or replace function public.track_day(p_kind text default 'open')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.user_days (user_id, day, consulted, supported, bairro)
  values (auth.uid(), public.irisa_today(), p_kind = 'consult', p_kind = 'support', p_kind = 'bairro')
  on conflict (user_id, day) do update
    set consulted = public.user_days.consulted or excluded.consulted,
        supported = public.user_days.supported or excluded.supported,
        bairro = public.user_days.bairro or excluded.bairro;
end $$;
revoke all on function public.track_day(text) from public, anon;
grant execute on function public.track_day(text) to authenticated;

create or replace function public.gami_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ratings int; v_weeks int; v_bairros int; v_cidades int; v_first int; v_fifth int; v_first_weeks int; v_places_ok int;
  v_places int; v_photos int; v_msgs int;
  v_week_days int; v_weeks_lit int; v_extra int; v_consult int; v_support int;
  v_faiscas int; v_opened_boxes int; v_gomos int; v_gomos_semana int; v_cut jsonb; v_created timestamptz; v_abre boolean;
  v_ajudou int; v_selo_cidade int; v_categorias int; v_da_casa int; v_msg_weeks int; v_datas int; v_bairro_dias int;
  v_meses int; v_mesmo_bairro int; v_resenhas int; v_reacoes int; v_perguntas int;
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
             and (o.created_at, o.id) < (r.created_at, r.id)) = 4),
         count(distinct date_trunc('week', created_at at time zone 'America/Sao_Paulo')) filter (where not exists (
           select 1 from public.place_ratings o
           where o.place_id = r.place_id and o.status = 'active'
             and (o.created_at, o.id) < (r.created_at, r.id)))
    into v_ratings, v_weeks, v_bairros, v_cidades, v_first, v_fifth, v_first_weeks
  from r;
  -- Lugar cadastrado só conta quando outra pessoa avaliou (confirma que o lugar existe e é útil).
  select count(*) into v_places_ok from public.places p
  where p.created_by = p_user and p.status = 'active'
    and exists (select 1 from public.place_ratings o where o.place_id = p.id and o.status = 'active'
                  and o.user_id is distinct from p_user);

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

  -- ---------- as 20 da segunda leva (migration 48) ----------
  -- "Ajudou": pessoas que abriram a ficha de um lugar depois da sua avaliação (place_views, migration 47:
  -- só contagem por lugar e dia; o app conta cada lugar uma vez por aparelho).
  select coalesce(sum(v.n), 0) into v_ajudou
  from public.place_views v
  join public.place_ratings r on r.place_id = v.place_id and r.user_id = p_user and r.status = 'active'
  where v.day >= (r.created_at at time zone 'America/Sao_Paulo')::date;
  -- Selos acesos (5ª avaliação) na cidade em que a pessoa mais acendeu.
  select coalesce(max(n), 0) into v_selo_cidade from (
    select p.city_id, count(*) as n
    from public.place_ratings pr join public.places p on p.id = pr.place_id and p.status = 'active'
    where pr.user_id = p_user and pr.status = 'active'
      and (select count(*) from public.place_ratings o
            where o.place_id = pr.place_id and o.status = 'active'
              and (o.created_at, o.id) < (pr.created_at, pr.id)) = 4
    group by p.city_id) s;
  select count(distinct p.category), count(*) filter (where pr.updated_at - pr.created_at >= interval '180 days'),
         count(*) filter (where char_length(btrim(coalesce(pr.comment, ''))) >= 60)
    into v_categorias, v_da_casa, v_resenhas
  from public.place_ratings pr join public.places p on p.id = pr.place_id and p.status = 'active'
  where pr.user_id = p_user and pr.status = 'active';
  -- Bairro em que a pessoa mais avaliou.
  select coalesce(max(n), 0) into v_mesmo_bairro from (
    select p.neighborhood_id, count(*) as n
    from public.place_ratings pr join public.places p on p.id = pr.place_id and p.status = 'active'
    where pr.user_id = p_user and pr.status = 'active' and p.neighborhood_id is not null
    group by p.neighborhood_id) b;
  select count(distinct date_trunc('week', created_at at time zone 'America/Sao_Paulo')),
         count(distinct date_trunc('week', created_at at time zone 'America/Sao_Paulo')) filter (where prompt is not null)
    into v_msg_weeks, v_perguntas
  from public.support_messages where created_by = p_user and status = 'active';
  select count(*) into v_reacoes
  from public.support_reactions sr join public.support_messages m on m.id = sr.message_id
  where m.created_by = p_user and m.status = 'active' and sr.user_id is distinct from p_user;
  -- As 6 datas da comunidade: visibilidade trans (29/01), contra a LGBTIfobia (17/05), orgulho (28/06),
  -- visibilidade lésbica (29/08), visibilidade bi (23/09) e saída do armário (11/10). Abrir o app no dia.
  select count(distinct to_char(day, 'MM-DD')) into v_datas from public.user_days
  where user_id = p_user and to_char(day, 'MM-DD') in ('01-29', '05-17', '06-28', '08-29', '09-23', '10-11');
  select count(*) filter (where bairro) into v_bairro_dias from public.user_days where user_id = p_user;
  -- Meses diferentes com contribuição (avaliação, lugar, foto aprovada ou mensagem de apoio).
  select count(distinct mes) into v_meses from (
    select date_trunc('month', created_at at time zone 'America/Sao_Paulo') as mes from public.place_ratings
     where user_id = p_user and status = 'active'
    union select date_trunc('month', created_at at time zone 'America/Sao_Paulo') from public.places
     where created_by = p_user and status = 'active'
    union select date_trunc('month', coalesce(reviewed_at, created_at) at time zone 'America/Sao_Paulo') from public.place_photos
     where user_id = p_user and status = 'active' and review = 'aprovada'
    union select date_trunc('month', created_at at time zone 'America/Sao_Paulo') from public.support_messages
     where created_by = p_user and status = 'active') m;

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
      case when v_ratings >= 10 and v_weeks < 2
        then jsonb_build_object('id', 'deu-close', 'valor', v_weeks, 'alvo', 2, 'ok', false, 'unidade', 'semanas')
        else jsonb_build_object('id', 'deu-close', 'valor', least(v_ratings, 10), 'alvo', 10, 'ok', v_ratings >= 10 and v_weeks >= 2, 'unidade', 'avaliações') end,
      -- Com as avaliações feitas e faltando semana, o progresso passa a contar as semanas: nada de 15/15 trancada.
      case when v_ratings >= 15 and v_weeks < 3
        then jsonb_build_object('id', 'figurinha', 'valor', v_weeks, 'alvo', 3, 'ok', false, 'unidade', 'semanas')
        else jsonb_build_object('id', 'figurinha', 'valor', least(v_ratings, 15), 'alvo', 15, 'ok', v_ratings >= 15 and v_weeks >= 3, 'unidade', 'avaliações') end,
      case when v_ratings >= 30 and v_weeks < 4
        then jsonb_build_object('id', 'famosinha', 'valor', v_weeks, 'alvo', 4, 'ok', false, 'unidade', 'semanas')
        else jsonb_build_object('id', 'famosinha', 'valor', least(v_ratings, 30), 'alvo', 30, 'ok', v_ratings >= 30 and v_weeks >= 4, 'unidade', 'avaliações') end,
      case when v_first >= 3 and v_first_weeks < 2
        then jsonb_build_object('id', 'inaugurou', 'valor', v_first_weeks, 'alvo', 2, 'ok', false, 'unidade', 'semanas')
        else jsonb_build_object('id', 'inaugurou', 'valor', least(v_first, 3), 'alvo', 3, 'ok', v_first >= 3 and v_first_weeks >= 2, 'unidade', 'lugares') end,
      jsonb_build_object('id', 'acendeu-a-luz', 'valor', least(v_fifth, 1), 'alvo', 1, 'ok', v_fifth >= 1),
      jsonb_build_object('id', 'eu-conheco', 'valor', least(v_places_ok, 1), 'alvo', 1, 'ok', v_places_ok >= 1),
      jsonb_build_object('id', 'nome-na-lista', 'valor', least(v_bairros, 6), 'alvo', 6, 'unidade', 'bairros', 'ok', v_bairros >= 6),
      jsonb_build_object('id', 'mala-pronta', 'valor', least(v_cidades, 3), 'alvo', 3, 'unidade', 'cidades', 'ok', v_cidades >= 3),
      jsonb_build_object('id', 'bateu-ponto', 'valor', case when v_weeks_lit > 0 then 4 else least(v_week_days, 4) end, 'alvo', 4, 'ok', v_weeks_lit >= 1, 'unidade', 'dias'),
      jsonb_build_object('id', 'ombro-amigo', 'valor', least(v_msgs, 10), 'alvo', 10, 'unidade', 'mensagens', 'ok', v_msgs >= 10),
      jsonb_build_object('id', 'abre-alas', 'valor', case when v_abre then 1 else 0 end, 'alvo', 1, 'ok', v_abre),
      -- segunda leva
      jsonb_build_object('id', 'sabe-onde-ir', 'valor', least(v_categorias, 4), 'alvo', 4, 'unidade', 'categorias', 'ok', v_categorias >= 4),
      jsonb_build_object('id', 'dona-do-pedaco', 'valor', least(v_mesmo_bairro, 5), 'alvo', 5, 'unidade', 'lugares', 'ok', v_mesmo_bairro >= 5),
      jsonb_build_object('id', 'resenha-boa', 'valor', least(v_resenhas, 10), 'alvo', 10, 'unidade', 'avaliações', 'ok', v_resenhas >= 10),
      jsonb_build_object('id', 'pode-entrar', 'valor', least(v_photos, 3), 'alvo', 3, 'unidade', 'fotos', 'ok', v_photos >= 3),
      jsonb_build_object('id', 'icone-local', 'valor', least(v_selo_cidade, 3), 'alvo', 3, 'unidade', 'lugares', 'ok', v_selo_cidade >= 3),
      jsonb_build_object('id', 'lenda-local', 'valor', least(v_selo_cidade, 10), 'alvo', 10, 'unidade', 'lugares', 'ok', v_selo_cidade >= 10),
      jsonb_build_object('id', 'utilidade-publica', 'valor', least(v_ajudou, 10), 'alvo', 10, 'unidade', 'pessoas', 'ok', v_ajudou >= 10),
      jsonb_build_object('id', 'interesse-municipal', 'valor', least(v_ajudou, 50), 'alvo', 50, 'unidade', 'pessoas', 'ok', v_ajudou >= 50),
      jsonb_build_object('id', 'aclamada', 'valor', least(v_ajudou, 150), 'alvo', 150, 'unidade', 'pessoas', 'ok', v_ajudou >= 150),
      case when v_ratings >= 60 and v_ajudou < 25
        then jsonb_build_object('id', 'influ-do-vale', 'valor', v_ajudou, 'alvo', 25, 'unidade', 'pessoas', 'ok', false)
        else jsonb_build_object('id', 'influ-do-vale', 'valor', least(v_ratings, 60), 'alvo', 60, 'unidade', 'avaliações', 'ok', v_ratings >= 60 and v_ajudou >= 25) end,
      jsonb_build_object('id', 'da-casa', 'valor', least(v_da_casa, 1), 'alvo', 1, 'ok', v_da_casa >= 1),
      jsonb_build_object('id', 'ja-mora-aqui', 'valor', least(v_weeks_lit, 4), 'alvo', 4, 'unidade', 'semanas', 'ok', v_weeks_lit >= 4),
      jsonb_build_object('id', 'olho-vivo', 'valor', least(v_bairro_dias, 5), 'alvo', 5, 'unidade', 'dias', 'ok', v_bairro_dias >= 5),
      jsonb_build_object('id', 'agenda-cheia', 'valor', least(v_datas, 6), 'alvo', 6, 'unidade', 'datas', 'ok', v_datas >= 6),
      jsonb_build_object('id', 'bateu-leque', 'valor', least(v_msg_weeks, 10), 'alvo', 10, 'unidade', 'semanas', 'ok', v_msg_weeks >= 10),
      jsonb_build_object('id', 'cartografa', 'valor', least(v_places_ok, 5), 'alvo', 5, 'unidade', 'lugares', 'ok', v_places_ok >= 5),
      jsonb_build_object('id', 'abraco-coletivo', 'valor', least(v_reacoes, 20), 'alvo', 20, 'unidade', 'reações', 'ok', v_reacoes >= 20),
      jsonb_build_object('id', 'tem-opiniao', 'valor', least(v_perguntas, 4), 'alvo', 4, 'unidade', 'semanas', 'ok', v_perguntas >= 4),
      jsonb_build_object('id', 'patrimonio-cultural', 'valor', v_gomos, 'alvo', 48, 'unidade', 'gomos', 'ok', v_gomos >= 48),
      case when v_meses >= 10 and v_created > now() - interval '1 year'
        then jsonb_build_object('id', 'patrimonio-tombado', 'valor', 0, 'alvo', 1, 'unidade', 'ano', 'ok', false)
        else jsonb_build_object('id', 'patrimonio-tombado', 'valor', least(v_meses, 10), 'alvo', 10, 'unidade', 'meses', 'ok', v_meses >= 10 and v_created <= now() - interval '1 year') end
    )
  );
end $$;
revoke all on function public.gami_stats(uuid) from public, anon, authenticated;
