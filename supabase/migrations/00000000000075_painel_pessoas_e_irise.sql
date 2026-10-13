-- Painel (13/10/2026, pedido do Leandro): a lista de Pessoas não carregava e o irise de cada
-- pessoa não aparecia em lugar nenhum do painel.
--
-- Por que a lista caía: `admin_users` (migration 39) fazia, para CADA perfil, `count(*)` e `max()`
-- em `places where created_by = p.id` — e `places` não tem índice em `created_by`. Com ~160 mil
-- lugares do Overture, isso virou uma varredura da tabela inteira por pessoa (duas, contando o
-- `max`), e a soma passou do statement_timeout. Agora cada contagem é feita uma vez só, agrupada
-- por pessoa, e as colunas de dono ganham índice (vale também para a ficha da pessoa).

create index if not exists places_created_by_idx on public.places (created_by) where created_by is not null;
create index if not exists support_messages_created_by_idx on public.support_messages (created_by) where created_by is not null;
create index if not exists place_ratings_user_idx on public.place_ratings (user_id) where user_id is not null;
create index if not exists support_likes_user_idx on public.support_likes (user_id);
create index if not exists profiles_irise_personagem_idx on public.profiles (irise_personagem) where irise_personagem is not null;

-- O tipo de retorno muda (entram irise e irise_nome), então tem que sair antes.
drop function if exists public.admin_users(text, integer, integer, text);
create function public.admin_users(
  p_busca text default null, p_limite integer default 50, p_offset integer default 0, p_ordem text default 'recente'
) returns table (
  id uuid, email text, apelido text, papel public.user_role, cidade text,
  criado_em timestamptz, ultimo_login timestamptz, ultimo_dia date, dias_30 bigint, tem_push boolean,
  avaliacoes bigint, mensagens bigint, lugares bigint, medalhas bigint, ultima_interacao timestamptz,
  irise smallint, irise_nome text, total bigint
) language plpgsql stable security definer set search_path = public as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(true);
  return query
  with pessoas as (
    select p.id, u.email::text as email, p.nickname, p.role, p.default_city_id, p.created_at,
           u.last_sign_in_at, p.irise_personagem
    from public.profiles p
    left join auth.users u on u.id = p.id
    where v_busca is null or u.email ilike '%' || v_busca || '%' or p.nickname ilike '%' || v_busca || '%'
  ),
  dias as (
    select d.user_id, max(d.day) as ultimo, count(*) filter (where d.day > public.irisa_today() - 30) as n30
    from public.user_days d group by d.user_id
  ),
  aval as (select r.user_id, count(*) as n, max(r.updated_at) as ult from public.place_ratings r where r.user_id is not null group by r.user_id),
  msg as (select m.created_by as user_id, count(*) as n, max(m.created_at) as ult from public.support_messages m where m.created_by is not null group by m.created_by),
  lug as (select l.created_by as user_id, count(*) as n, max(l.created_at) as ult from public.places l where l.created_by is not null group by l.created_by),
  med as (select um.user_id, count(*) as n from public.user_medals um group by um.user_id),
  cur as (select k.user_id, max(k.created_at) as ult from public.support_likes k group by k.user_id),
  base as (
    select pe.id, pe.email, pe.nickname as apelido, pe.role as papel,
           c.name || ' · ' || c.state as cidade, pe.created_at as criado_em,
           pe.last_sign_in_at as ultimo_login,
           di.ultimo as ultimo_dia, coalesce(di.n30, 0) as dias_30,
           exists (select 1 from public.push_tokens t where t.user_id = pe.id) as tem_push,
           coalesce(av.n, 0) as avaliacoes, coalesce(ms.n, 0) as mensagens,
           coalesce(lu.n, 0) as lugares, coalesce(me.n, 0) as medalhas,
           greatest(av.ult, ms.ult, lu.ult, cu.ult) as ultima_interacao,
           pe.irise_personagem as irise, ip.nome as irise_nome
    from pessoas pe
    left join public.cities c on c.id = pe.default_city_id
    left join dias di on di.user_id = pe.id
    left join aval av on av.user_id = pe.id
    left join msg ms on ms.user_id = pe.id
    left join lug lu on lu.user_id = pe.id
    left join med me on me.user_id = pe.id
    left join cur cu on cu.user_id = pe.id
    left join public.irise_personagens ip on ip.n = pe.irise_personagem
  )
  select b.*, count(*) over () as total from base b
  order by case p_ordem
             when 'ativo' then coalesce(b.ultimo_dia::timestamptz, b.criado_em)
             when 'interacao' then coalesce(b.ultima_interacao, '-infinity'::timestamptz)
             else b.criado_em end desc nulls last
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.admin_users(text, integer, integer, text) from public, anon;
grant execute on function public.admin_users(text, integer, integer, text) to authenticated;

-- Ficha da pessoa: mesmo conteúdo da migration 64 + o irise escolhido.
create or replace function public.admin_user(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.admin_guard(true);
  select jsonb_build_object(
    'id', p.id, 'email', u.email, 'apelido', p.nickname, 'papel', p.role, 'forma', p.medal_form,
    'cidade', (select c.name || ' · ' || c.state from public.cities c where c.id = p.default_city_id),
    'criado_em', p.created_at, 'ultimo_login', u.last_sign_in_at,
    'avatar', p.avatar_path,
    'irise', p.irise_personagem,
    'irise_nome', (select ip.nome from public.irise_personagens ip where ip.n = p.irise_personagem)
  ) into v
  from public.profiles p left join auth.users u on u.id = p.id where p.id = p_id;
  if v is null then raise exception 'Pessoa não encontrada'; end if;
  return v || jsonb_build_object(
    'gamificacao', public.gami_stats(p_id),
    'gomos_calculados', (public.gami_stats_calc(p_id)->>'gomos')::int,
    'ajuste_gomos', coalesce((select gomos from public.gami_ajustes where user_id = p_id), 0),
    'revogadas', coalesce((select jsonb_agg(medal_id) from public.user_medals_revogadas where user_id = p_id), '[]'::jsonb),
    'conquistadas', coalesce((select jsonb_agg(jsonb_build_object('id', medal_id, 'em', unlocked_at, 'visto', seen_at, 'banho', finish) order by unlocked_at)
                              from public.user_medals where user_id = p_id), '[]'::jsonb),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('dia', day, 'consultou', consulted, 'apoiou', supported) order by day desc)
                      from (select * from public.user_days where user_id = p_id order by day desc limit 60) d), '[]'::jsonb),
    'avaliacoes', coalesce((select jsonb_agg(x order by x->>'em' desc) from (
        select jsonb_build_object('id', r.id, 'lugar', l.name, 'lugar_id', l.id, 'nota', coalesce(r.overall, r.stars),
                                  'comentario', r.comment, 'status', r.status, 'em', r.updated_at) as x
        from public.place_ratings r join public.places l on l.id = r.place_id
        where r.user_id = p_id order by r.updated_at desc limit 30) a), '[]'::jsonb),
    'mensagens', coalesce((select jsonb_agg(x order by x->>'em' desc) from (
        select jsonb_build_object('id', m.id, 'conteudo', m.content, 'categoria', m.category, 'status', m.status, 'em', m.created_at) as x
        from public.support_messages m where m.created_by = p_id order by m.created_at desc limit 30) b), '[]'::jsonb),
    'lugares', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.name, 'status', l.status, 'em', l.created_at) order by l.created_at desc)
                         from public.places l where l.created_by = p_id), '[]'::jsonb),
    'aparelhos', coalesce((select jsonb_agg(jsonb_build_object('plataforma', platform, 'atualizado', updated_at))
                           from public.push_tokens where user_id = p_id), '[]'::jsonb),
    'pushs_abertos', (select count(*) from public.push_aberturas where user_id = p_id)
  );
end $$;
revoke all on function public.admin_user(uuid) from public, anon;
grant execute on function public.admin_user(uuid) to authenticated;

-- Métricas dos personagens: quantas pessoas escolheram um irise e qual. Só contagem; nunca lista
-- quem escolheu (isso fica na ficha de cada pessoa, que o admin já abre um a um).
create or replace function public.admin_irise_metricas()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_total bigint; v_com bigint;
begin
  perform public.admin_guard(true);
  select count(*), count(*) filter (where irise_personagem is not null) into v_total, v_com from public.profiles;
  return jsonb_build_object(
    'pessoas', v_total,
    'com_irise', v_com,
    'sem_irise', v_total - v_com,
    'por_personagem', coalesce((
      select jsonb_agg(jsonb_build_object('n', x.n, 'pessoas', x.pessoas) order by x.pessoas desc, x.n)
      from (select irise_personagem as n, count(*) as pessoas from public.profiles
            where irise_personagem is not null group by irise_personagem) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_irise_metricas() from public, anon;
grant execute on function public.admin_irise_metricas() to authenticated;

-- Foto do personagem pelo painel sobe com upsert (mesmo caminho `<personagem>/<pose>.webp`), e no
-- Storage o upsert pede SELECT além de INSERT/UPDATE — mesmo caso da migration 68. Sem isto, trocar
-- foto de personagem dava "new row violates row-level security policy".
drop policy if exists "irise fotos: admin vê" on storage.objects;
create policy "irise fotos: admin vê" on storage.objects for select to authenticated
  using (bucket_id = 'irise' and public.is_admin());
