-- Gamificação (proposta final de 04/10/2026) e o painel de administração na web.
-- Só acrescenta: nenhuma tabela, coluna ou função que o app usa hoje muda de comportamento.
--
-- Gamificação
--   user_days      um registro por pessoa por dia em que abriu o app (só a data: sem hora, sem lugar)
--   user_medals    medalhas desbloqueadas, quando a pessoa viu e o banho que a caixinha deu
--   user_boxes     caixinhas abertas
--   my_gamification() calcula anel, semana, faíscas, caixinhas, cidade e medalhas, e grava o que desbloqueou
-- Regras: relato nunca pontua; nada aqui aparece para outra pessoa; medalha não guarda lugar.
--
-- Painel (docs/admin, publicado no site em /admin/)
--   funções admin_* com checagem de papel (admin ou moderação) dentro de cada uma.
--   O painel nunca liga relato a uma pessoa: admin_user não lista relatos.

-- ---------- configurações editáveis pelo painel ----------
create table public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.app_settings enable row level security;
-- Sem policy: o app lê pelo app_config(), o painel pelas funções admin_settings.
insert into public.app_settings (key, value) values
  ('aviso', '{"ativo": false, "titulo": "", "texto": "", "url": null}'::jsonb),
  -- Abre-Alas vale para quem criou a conta até esta data. null = ainda em teste, vale para todo mundo.
  ('abre_alas_ate', 'null'::jsonb)
on conflict (key) do nothing;

create or replace function public.app_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.app_settings where key in ('aviso');
$$;
revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.my_role() = 'admin';
$$;

-- ---------- gamificação: dados ----------
alter table public.profiles
  add column if not exists medal_form smallint not null default 2 check (medal_form between 0 and 2);
comment on column public.profiles.medal_form is 'Como as medalhas chamam a pessoa: 0 = a (Famosinha), 1 = o, 2 = e (padrão).';

create table public.user_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  consulted boolean not null default false,
  supported boolean not null default false,
  primary key (user_id, day)
);
create index user_days_day_idx on public.user_days (day);
alter table public.user_days enable row level security;
comment on table public.user_days is 'Dias em que a pessoa abriu a Irisa (só a data). consulted = abriu a ficha de um lugar; supported = escreveu no mural.';

create table public.user_medals (
  user_id uuid not null references auth.users (id) on delete cascade,
  medal_id text not null,
  unlocked_at timestamptz not null default now(),
  seen_at timestamptz,
  finish text check (finish in ('neon', 'holo', 'dourado')),
  primary key (user_id, medal_id)
);
create index user_medals_unlocked_idx on public.user_medals (unlocked_at desc);
alter table public.user_medals enable row level security;

create table public.user_boxes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  medal_id text not null,
  finish text not null check (finish in ('neon', 'holo', 'dourado')),
  opened_at timestamptz not null default now()
);
create index user_boxes_user_idx on public.user_boxes (user_id);
alter table public.user_boxes enable row level security;

create or replace function public.irisa_today()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- O app chama ao abrir ('open') e ao abrir a ficha de um lugar ('consult'). O mural marca sozinho (trigger).
create or replace function public.track_day(p_kind text default 'open')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.user_days (user_id, day, consulted, supported)
  values (auth.uid(), public.irisa_today(), p_kind = 'consult', p_kind = 'support')
  on conflict (user_id, day) do update
    set consulted = public.user_days.consulted or excluded.consulted,
        supported = public.user_days.supported or excluded.supported;
end $$;
revoke all on function public.track_day(text) from public, anon;
grant execute on function public.track_day(text) to authenticated;

create or replace function public.track_support_day()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.user_days (user_id, day, supported)
    values (new.created_by, public.irisa_today(), true)
    on conflict (user_id, day) do update set supported = true;
  end if;
  return new;
end $$;
create trigger support_messages_track_day
  after insert on public.support_messages
  for each row execute function public.track_support_day();

-- ---------- gamificação: cálculo ----------
-- Interna: não é chamada pelo app direto (my_gamification e admin_user usam).
create or replace function public.gami_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ratings int; v_weeks int; v_bairros int; v_cidades int; v_first int; v_fifth int;
  v_places int; v_photos int; v_msgs int;
  v_week_days int; v_weeks_lit int; v_extra int; v_consult int; v_support int;
  v_faiscas int; v_opened_boxes int; v_gomos int; v_cut jsonb; v_created timestamptz; v_abre boolean;
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
  v_gomos := least(48, v_ratings + v_first + v_fifth + v_places + v_photos);

  select value into v_cut from public.app_settings where key = 'abre_alas_ate';
  select created_at into v_created from public.profiles where id = p_user;
  v_abre := v_cut is null or jsonb_typeof(v_cut) = 'null'
            or v_created <= ((v_cut #>> '{}')::date + 1)::timestamptz;

  return jsonb_build_object(
    'gomos', v_gomos,
    'nivel', case when v_gomos = 0 then 0 else ceil(v_gomos / 8.0)::int end,
    'avaliacoes', v_ratings,
    'semana', jsonb_build_object('dias', v_week_days, 'acesa', v_week_days >= 4,
                                 'extra', least(greatest(v_week_days - 4, 0), 3)),
    'semanas_acesas', v_weeks_lit,
    'faiscas', jsonb_build_object('total', v_faiscas, 'rumo', v_faiscas % 10),
    'caixinhas', greatest(0, (v_faiscas / 10) + v_weeks_lit - v_opened_boxes),
    'medalhas', jsonb_build_array(
      jsonb_build_object('id', 'deu-o-nome', 'valor', least(v_ratings, 1), 'alvo', 1, 'ok', v_ratings >= 1),
      jsonb_build_object('id', 'deu-close', 'valor', least(v_ratings, 5), 'alvo', 5, 'ok', v_ratings >= 5),
      jsonb_build_object('id', 'figurinha', 'valor', least(v_ratings, 15), 'alvo', 15, 'ok', v_ratings >= 15 and v_weeks >= 3),
      jsonb_build_object('id', 'famosinha', 'valor', least(v_ratings, 30), 'alvo', 30, 'ok', v_ratings >= 30 and v_weeks >= 4),
      jsonb_build_object('id', 'inaugurou', 'valor', least(v_first, 1), 'alvo', 1, 'ok', v_first >= 1),
      jsonb_build_object('id', 'acendeu-a-luz', 'valor', least(v_fifth, 1), 'alvo', 1, 'ok', v_fifth >= 1),
      jsonb_build_object('id', 'eu-conheco', 'valor', least(v_places, 1), 'alvo', 1, 'ok', v_places >= 1),
      jsonb_build_object('id', 'nome-na-lista', 'valor', least(v_bairros, 5), 'alvo', 5, 'ok', v_bairros >= 5),
      jsonb_build_object('id', 'mala-pronta', 'valor', least(v_cidades, 3), 'alvo', 3, 'ok', v_cidades >= 3),
      jsonb_build_object('id', 'bateu-ponto', 'valor', case when v_weeks_lit > 0 then 4 else least(v_week_days, 4) end, 'alvo', 4, 'ok', v_weeks_lit >= 1),
      jsonb_build_object('id', 'ombro-amigo', 'valor', least(v_msgs, 10), 'alvo', 10, 'ok', v_msgs >= 10),
      jsonb_build_object('id', 'abre-alas', 'valor', case when v_abre then 1 else 0 end, 'alvo', 1, 'ok', v_abre)
    )
  );
end $$;
revoke all on function public.gami_stats(uuid) from public, anon, authenticated;

-- Cidade: quantos dos 100 lugares mais conhecidos (prominence) já têm selo (5 avaliações).
create or replace function public.city_progress(p_city integer)
returns jsonb language sql stable security definer set search_path = public as $$
  with top as (
    select p.id from public.places p
    where p.city_id = p_city and p.status = 'active'
    order by p.prominence desc, p.created_at
    limit 100
  ), quinta as (
    select t.id, (select pr.created_at from public.place_ratings pr
                  where pr.place_id = t.id and pr.status = 'active'
                  order by pr.created_at, pr.id offset 4 limit 1) as em
    from top t
  )
  select jsonb_build_object(
    'cidade', p_city,
    'total', (select count(*) from top),
    'com_selo', count(*) filter (where em is not null),
    'semana', count(*) filter (where em >= date_trunc('week', public.irisa_today())::timestamptz)
  ) from quinta;
$$;
revoke all on function public.city_progress(integer) from public, anon;
grant execute on function public.city_progress(integer) to authenticated;

-- O que o app chama. Grava as medalhas que acabaram de desbloquear e devolve tudo de uma vez.
create or replace function public.my_gamification(p_city integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_stats jsonb; v_city integer;
begin
  if v_uid is null then return null; end if;
  v_stats := public.gami_stats(v_uid);
  insert into public.user_medals (user_id, medal_id)
  select v_uid, m->>'id' from jsonb_array_elements(v_stats->'medalhas') m
  where (m->>'ok')::boolean
  on conflict do nothing;
  select coalesce(p_city, default_city_id) into v_city from public.profiles where id = v_uid;
  return v_stats || jsonb_build_object(
    'forma', (select medal_form from public.profiles where id = v_uid),
    'conquistadas', coalesce((
      select jsonb_agg(jsonb_build_object('id', medal_id, 'em', unlocked_at, 'visto', seen_at is not null, 'banho', finish)
                       order by unlocked_at)
      from public.user_medals where user_id = v_uid), '[]'::jsonb),
    'cidade', case when v_city is null then null else public.city_progress(v_city) end
  );
end $$;
revoke all on function public.my_gamification(integer) from public, anon;
grant execute on function public.my_gamification(integer) to authenticated;

create or replace function public.mark_medals_seen(p_ids text[])
returns void language sql security definer set search_path = public as $$
  update public.user_medals set seen_at = now()
  where user_id = auth.uid() and medal_id = any (p_ids) and seen_at is null;
$$;
revoke all on function public.mark_medals_seen(text[]) from public, anon;
grant execute on function public.mark_medals_seen(text[]) to authenticated;

create or replace function public.set_medal_form(p_form smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_form not between 0 and 2 then raise exception 'Forma inválida'; end if;
  update public.profiles set medal_form = p_form where id = auth.uid();
end $$;
revoke all on function public.set_medal_form(smallint) from public, anon;
grant execute on function public.set_medal_form(smallint) to authenticated;

-- Abre uma caixinha: banho surpresa numa medalha que a pessoa já tem.
create or replace function public.open_box()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_stats jsonb; v_medal text; v_finish text; v_r float;
begin
  if v_uid is null then raise exception 'Entre na conta.'; end if;
  v_stats := public.gami_stats(v_uid);
  if (v_stats->>'caixinhas')::int <= 0 then raise exception 'Nenhuma caixinha para abrir agora.'; end if;
  select medal_id into v_medal from public.user_medals where user_id = v_uid order by random() limit 1;
  if v_medal is null then raise exception 'A caixinha espera a sua primeira medalha.'; end if;
  v_r := random();
  v_finish := case when v_r < 0.45 then 'neon' when v_r < 0.9 then 'holo' else 'dourado' end;
  update public.user_medals set finish = v_finish where user_id = v_uid and medal_id = v_medal;
  insert into public.user_boxes (user_id, medal_id, finish) values (v_uid, v_medal, v_finish);
  return jsonb_build_object('medalha', v_medal, 'banho', v_finish);
end $$;
revoke all on function public.open_box() from public, anon;
grant execute on function public.open_box() to authenticated;

-- ---------- push: quem abriu ----------
create table public.push_aberturas (
  envio_id bigint not null references public.push_envios (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  aberto_em timestamptz not null default now(),
  primary key (envio_id, user_id)
);
alter table public.push_aberturas enable row level security;

create or replace function public.push_aberto(p_envio bigint)
returns void language sql security definer set search_path = public as $$
  insert into public.push_aberturas (envio_id, user_id)
  select p_envio, auth.uid()
  where auth.uid() is not null and exists (select 1 from public.push_envios where id = p_envio)
  on conflict do nothing;
$$;
revoke all on function public.push_aberto(bigint) from public, anon;
grant execute on function public.push_aberto(bigint) to authenticated;

-- ---------- foto da equipe ----------
-- Foto que a equipe sobe pelo painel: origem 'equipe' nas duas colunas de origem.
do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    join pg_class t on t.oid = con.conrelid and t.relname = 'places'
    join pg_namespace n on n.oid = t.relnamespace and n.nspname = 'public'
    where con.contype = 'c' and pg_get_constraintdef(con.oid) like '%photo_source%'
  loop
    execute format('alter table public.places drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.places
  add constraint places_photo_source_check
    check (photo_source in ('mapillary', 'usuario', 'wikimedia', 'equipe')),
  add constraint places_origin_photo_source_check
    check (origin_photo_source in ('mapillary', 'usuario', 'wikimedia', 'equipe'));

create policy "fotos: equipe sobe" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-lugares' and (storage.foldername(name))[1] = 'equipe' and public.is_moderator());
create policy "fotos: equipe troca" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-lugares' and (storage.foldername(name))[1] = 'equipe' and public.is_moderator())
  with check (bucket_id = 'fotos-lugares' and (storage.foldername(name))[1] = 'equipe' and public.is_moderator());
create policy "fotos: equipe apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-lugares' and (storage.foldername(name))[1] = 'equipe' and public.is_moderator());

-- ======================================================================
-- Painel de administração
-- ======================================================================
create or replace function public.admin_guard(p_admin boolean default true)
returns void language plpgsql stable as $$
begin
  if p_admin and not public.is_admin() then
    raise exception 'Somente administração' using errcode = '42501';
  elsif not p_admin and not public.is_moderator() then
    raise exception 'Somente moderação' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hoje date := public.irisa_today();
begin
  perform public.admin_guard(false);
  return jsonb_build_object(
    'usuarios', (select count(*) from public.profiles),
    'novos_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'ativos_hoje', (select count(distinct user_id) from public.user_days where day = v_hoje),
    'ativos_7d', (select count(distinct user_id) from public.user_days where day > v_hoje - 7),
    'ativos_30d', (select count(distinct user_id) from public.user_days where day > v_hoje - 30),
    'avaliacoes_total', (select count(*) from public.place_ratings where status = 'active'),
    'avaliacoes_7d', (select count(*) from public.place_ratings where created_at > now() - interval '7 days'),
    'mensagens_7d', (select count(*) from public.support_messages where created_at > now() - interval '7 days'),
    'relatos_7d', (select count(*) from public.occurrences where created_at > now() - interval '7 days'),
    'lugares_ativos', (select count(*) from public.places where status = 'active'),
    'lugares_novos_7d', (select count(*) from public.places where created_at > now() - interval '7 days' and created_by is not null),
    'lugares_com_selo', (select count(*) from public.place_scores where rating_count >= 5),
    'denuncias_abertas', (select count(distinct (target_type, target_id)) from public.content_reports where status = 'open'),
    'fotos_na_fila', (select count(*) from public.place_photos where review in ('pendente', 'humano') and status = 'active'),
    'aparelhos_push', (select count(*) from public.push_tokens),
    'pushs_agendados', (select count(*) from public.push_envios where status = 'agendada'),
    'medalhas_7d', (select count(*) from public.user_medals where unlocked_at > now() - interval '7 days'),
    'serie', (
      select jsonb_agg(jsonb_build_object(
        'dia', d,
        'ativos', (select count(*) from public.user_days u where u.day = d),
        'avaliacoes', (select count(*) from public.place_ratings pr
                       where (pr.created_at at time zone 'America/Sao_Paulo')::date = d),
        'novos', (select count(*) from public.profiles p
                  where (p.created_at at time zone 'America/Sao_Paulo')::date = d)
      ) order by d)
      from generate_series(v_hoje - 13, v_hoje, interval '1 day') g(d0), lateral (select g.d0::date as d) x
    )
  );
end $$;

-- Lista de pessoas. Nunca inclui relatos (são anônimos também para a equipe).
create or replace function public.admin_users(
  p_busca text default null, p_limite integer default 50, p_offset integer default 0, p_ordem text default 'recente'
) returns table (
  id uuid, email text, apelido text, papel public.user_role, cidade text,
  criado_em timestamptz, ultimo_login timestamptz, ultimo_dia date, dias_30 bigint, tem_push boolean,
  avaliacoes bigint, mensagens bigint, lugares bigint, medalhas bigint, ultima_interacao timestamptz, total bigint
) language plpgsql stable security definer set search_path = public as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(true);
  return query
  with base as (
    select p.id, u.email::text as email, p.nickname as apelido, p.role as papel,
           c.name || ' · ' || c.state as cidade, p.created_at as criado_em,
           u.last_sign_in_at as ultimo_login,
           (select max(d.day) from public.user_days d where d.user_id = p.id) as ultimo_dia,
           (select count(*) from public.user_days d where d.user_id = p.id and d.day > public.irisa_today() - 30) as dias_30,
           exists (select 1 from public.push_tokens t where t.user_id = p.id) as tem_push,
           (select count(*) from public.place_ratings r where r.user_id = p.id) as avaliacoes,
           (select count(*) from public.support_messages m where m.created_by = p.id) as mensagens,
           (select count(*) from public.places l where l.created_by = p.id) as lugares,
           (select count(*) from public.user_medals um where um.user_id = p.id) as medalhas,
           greatest(
             (select max(r.updated_at) from public.place_ratings r where r.user_id = p.id),
             (select max(m.created_at) from public.support_messages m where m.created_by = p.id),
             (select max(l.created_at) from public.places l where l.created_by = p.id),
             (select max(k.created_at) from public.support_likes k where k.user_id = p.id)
           ) as ultima_interacao
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join public.cities c on c.id = p.default_city_id
    where v_busca is null or u.email ilike '%' || v_busca || '%' or p.nickname ilike '%' || v_busca || '%'
  )
  select b.*, count(*) over () as total from base b
  order by case p_ordem
             when 'ativo' then coalesce(b.ultimo_dia::timestamptz, b.criado_em)
             when 'interacao' then coalesce(b.ultima_interacao, '-infinity'::timestamptz)
             else b.criado_em end desc nulls last
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.admin_user(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.admin_guard(true);
  select jsonb_build_object(
    'id', p.id, 'email', u.email, 'apelido', p.nickname, 'papel', p.role, 'forma', p.medal_form,
    'cidade', (select c.name || ' · ' || c.state from public.cities c where c.id = p.default_city_id),
    'criado_em', p.created_at, 'ultimo_login', u.last_sign_in_at,
    'avatar', p.avatar_path
  ) into v
  from public.profiles p left join auth.users u on u.id = p.id where p.id = p_id;
  if v is null then raise exception 'Pessoa não encontrada'; end if;
  return v || jsonb_build_object(
    'gamificacao', public.gami_stats(p_id),
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

create or replace function public.admin_set_role(p_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Você não pode tirar a própria administração.';
  end if;
  update public.profiles set role = p_role where id = p_id;
end $$;

-- Esconde de uma vez tudo o que a pessoa publicou (avaliações e mensagens). Relatos não entram.
create or replace function public.admin_hide_user_content(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_r int; v_m int;
begin
  perform public.admin_guard(true);
  update public.place_ratings set status = 'hidden' where user_id = p_id and status = 'active';
  get diagnostics v_r = row_count;
  update public.support_messages set status = 'hidden' where created_by = p_id and status = 'active';
  get diagnostics v_m = row_count;
  return jsonb_build_object('avaliacoes', v_r, 'mensagens', v_m);
end $$;

-- ---------- push pelo painel ----------
create or replace function public.admin_push_list(p_limite integer default 100)
returns table (
  id bigint, titulo text, corpo text, url text, cidade text, enviar_em timestamptz, status text,
  aparelhos integer, aceitos integer, falhas integer, erro text, criado_em timestamptz, enviado_em timestamptz, aberturas bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query
  select e.id, e.titulo, e.corpo, e.url, (select c.name || ' · ' || c.state from public.cities c where c.id = e.city_id),
         e.enviar_em, e.status, e.aparelhos, e.aceitos, e.falhas, e.erro, e.criado_em, e.enviado_em,
         (select count(*) from public.push_aberturas a where a.envio_id = e.id)
  from public.push_envios e
  order by e.enviar_em desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
end $$;

create or replace function public.admin_push_create(
  p_titulo text, p_corpo text, p_quando timestamptz default now(), p_url text default null, p_cidade integer default null
) returns bigint language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return public.enviar_notificacao(p_titulo, p_corpo, coalesce(p_quando, now()), nullif(p_url, ''), p_cidade);
end $$;

create or replace function public.admin_push_cancel(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  update public.push_envios set status = 'cancelada' where id = p_id and status = 'agendada';
  if not found then raise exception 'Só dá para cancelar notificação ainda agendada.'; end if;
end $$;

create or replace function public.admin_push_alcance(p_cidade integer default null)
returns bigint language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return (select count(*) from public.push_tokens t left join public.profiles p on p.id = t.user_id
          where p_cidade is null or p.default_city_id = p_cidade);
end $$;

-- ---------- moderação pelo painel ----------
create or replace function public.admin_ratings(
  p_status text default null, p_busca text default null, p_limite integer default 50, p_offset integer default 0
) returns table (
  id uuid, lugar text, lugar_id uuid, cidade text, apelido text, nota numeric, atendimento smallint, afeto smallint,
  banheiro smallint, clientela smallint, comentario text, status public.content_status, criado_em timestamptz,
  denuncias bigint, total bigint
) language plpgsql stable security definer set search_path = public as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select r.id, l.name, l.id, c.name, coalesce(pf.nickname, 'Anônimo'), coalesce(r.overall, r.stars::numeric),
         r.welcome, r.affection, r.restroom, r.crowd, r.comment, r.status, r.updated_at,
         (select count(*) from public.content_reports cr where cr.target_type = 'rating' and cr.target_id = r.id and cr.status = 'open'),
         count(*) over ()
  from public.place_ratings r
  join public.places l on l.id = r.place_id
  left join public.cities c on c.id = l.city_id
  left join public.profiles pf on pf.id = r.user_id
  where (p_status is null or r.status::text = p_status)
    and (v_busca is null or l.name ilike '%' || v_busca || '%' or r.comment ilike '%' || v_busca || '%')
  order by r.updated_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.admin_messages(
  p_status text default null, p_busca text default null, p_limite integer default 50, p_offset integer default 0
) returns table (
  id uuid, apelido text, categoria public.support_category, conteudo text, cidade text, status public.content_status,
  criado_em timestamptz, curtidas bigint, denuncias bigint, total bigint
) language plpgsql stable security definer set search_path = public as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select m.id, m.nickname, m.category, m.content, c.name, m.status, m.created_at,
         (select count(*) from public.support_likes k where k.message_id = m.id),
         (select count(*) from public.content_reports cr where cr.target_type = 'message' and cr.target_id = m.id and cr.status = 'open'),
         count(*) over ()
  from public.support_messages m left join public.cities c on c.id = m.city_id
  where (p_status is null or m.status::text = p_status)
    and (v_busca is null or m.content ilike '%' || v_busca || '%' or m.nickname ilike '%' || v_busca || '%')
  order by m.created_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Relatos sem autor: a equipe modera o conteúdo, nunca vê quem escreveu.
create or replace function public.admin_occurrences(
  p_status text default null, p_limite integer default 50, p_offset integer default 0
) returns table (
  id uuid, tipo public.occurrence_type, gravidade public.severity, descricao text, cidade text, bairro text,
  data date, status public.content_status, criado_em timestamptz, denuncias bigint, total bigint
) language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(false);
  return query
  select o.id, o.type, o.severity, o.description, c.name, n.name, o.occurrence_date, o.status, o.created_at,
         (select count(*) from public.content_reports cr where cr.target_type = 'occurrence' and cr.target_id = o.id and cr.status = 'open'),
         count(*) over ()
  from public.occurrences o
  left join public.cities c on c.id = o.city_id
  left join public.neighborhoods n on n.id = o.neighborhood_id
  where p_status is null or o.status::text = p_status
  order by o.created_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Muda o status e fecha as denúncias abertas daquele item (esconder = aceitas, voltar = recusadas).
create or replace function public.admin_set_status(p_type public.report_target, p_id uuid, p_status public.content_status)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.admin_guard(false);
  perform public.set_content_status(p_type, p_id, p_status);
  update public.content_reports
     set status = case when p_status = 'active' then 'rejected'::public.report_status else 'accepted'::public.report_status end,
         moderator_id = auth.uid(), resolved_at = now()
   where target_type = p_type and target_id = p_id and status = 'open';
end $$;

-- ---------- lugares pelo painel ----------
create or replace function public.admin_places(
  p_cidade integer default null, p_busca text default null, p_status text default null,
  p_limite integer default 50, p_offset integer default 0
) returns table (
  id uuid, nome text, categoria public.place_category, endereco text, cidade text, cidade_id integer, bairro text,
  lat double precision, lng double precision, status public.content_status, verificado boolean,
  avaliacoes integer, nota numeric, selo text, foto_url text, foto_origem text, relevancia smallint,
  criado_em timestamptz, total bigint
) language plpgsql stable security definer set search_path = public, extensions as $$
declare v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
begin
  perform public.admin_guard(false);
  return query
  select l.id, l.name, l.category, l.address, c.name || ' · ' || c.state, l.city_id, n.name,
         st_y(l.location::geometry), st_x(l.location::geometry), l.status, l.verified,
         coalesce(s.rating_count, 0), s.score, s.badge, l.photo_url, l.photo_source, l.prominence, l.created_at,
         count(*) over ()
  from public.places l
  left join public.cities c on c.id = l.city_id
  left join public.neighborhoods n on n.id = l.neighborhood_id
  left join public.place_scores s on s.place_id = l.id
  where (p_cidade is null or l.city_id = p_cidade)
    and (p_status is null or l.status::text = p_status)
    and (v_busca is null or strpos(public.place_name_key(l.name), public.place_name_key(v_busca)) > 0)
  order by coalesce(s.rating_count, 0) desc, l.prominence desc, l.created_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.admin_place_save(
  p_id uuid, p_nome text, p_categoria public.place_category, p_endereco text,
  p_lat double precision, p_lng double precision, p_status public.content_status default 'active',
  p_verificado boolean default false
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform public.admin_guard(false);
  -- quem cadastra pelo painel não esbarra no limite diário do app
  insert into public.rate_limit_exempt (user_id) values (auth.uid()) on conflict do nothing;
  if p_id is null then
    insert into public.places (name, category, address, location, status, verified)
    values (btrim(p_nome), p_categoria, nullif(btrim(coalesce(p_endereco, '')), ''),
            st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, coalesce(p_status, 'active'), coalesce(p_verificado, false))
    returning id into v_id;
  else
    update public.places
       set name = btrim(p_nome), category = p_categoria,
           address = nullif(btrim(coalesce(p_endereco, '')), ''),
           location = case when st_equals(location::geometry, st_setsrid(st_makepoint(p_lng, p_lat), 4326))
                           then location else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
           status = coalesce(p_status, status), verified = coalesce(p_verificado, verified)
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Lugar não encontrado'; end if;
  end if;
  return v_id;
end $$;

-- Foto que a equipe subiu no Storage (pasta equipe/). URL nula tira a foto da equipe.
create or replace function public.admin_place_photo(p_id uuid, p_url text, p_credito text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(false);
  if p_url is null then
    update public.places
       set photo_url = null, photo_source = null, photo_credit = null, photo_credit_uri = null, photo_at = null
     where id = p_id and photo_source = 'equipe';
  else
    update public.places
       set photo_url = p_url, photo_source = 'equipe', photo_credit = nullif(btrim(coalesce(p_credito, '')), ''),
           photo_credit_uri = null, photo_at = now()
     where id = p_id;
  end if;
end $$;

-- ---------- serviços de apoio pelo painel ----------
create or replace function public.admin_services()
returns table (
  id integer, nome text, tipo public.service_kind, telefone text, url text, descricao text,
  cidade_id integer, cidade text, uf char(2), ativo boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query
  select s.id, s.name, s.kind, s.phone, s.url, s.description, s.city_id, c.name, s.state, s.active
  from public.support_services s left join public.cities c on c.id = s.city_id
  order by (s.city_id is not null), c.name nulls first, s.name;
end $$;

create or replace function public.admin_service_save(
  p_id integer, p_nome text, p_tipo public.service_kind, p_telefone text, p_url text, p_descricao text,
  p_cidade integer, p_uf char(2), p_ativo boolean default true
) returns integer language plpgsql security definer set search_path = public as $$
declare v_id integer;
begin
  perform public.admin_guard(true);
  if p_id is null then
    insert into public.support_services (name, kind, phone, url, description, city_id, state, active)
    values (btrim(p_nome), p_tipo, nullif(btrim(coalesce(p_telefone, '')), ''), nullif(btrim(coalesce(p_url, '')), ''),
            nullif(btrim(coalesce(p_descricao, '')), ''), p_cidade, nullif(p_uf, ''), coalesce(p_ativo, true))
    returning id into v_id;
  else
    update public.support_services
       set name = btrim(p_nome), kind = p_tipo, phone = nullif(btrim(coalesce(p_telefone, '')), ''),
           url = nullif(btrim(coalesce(p_url, '')), ''), description = nullif(btrim(coalesce(p_descricao, '')), ''),
           city_id = p_cidade, state = nullif(p_uf, ''), active = coalesce(p_ativo, active)
     where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

-- ---------- configurações e medalhas pelo painel ----------
create or replace function public.admin_settings()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.app_settings);
end $$;

create or replace function public.admin_setting_set(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_key not in ('aviso', 'abre_alas_ate') then raise exception 'Configuração desconhecida: %', p_key; end if;
  insert into public.app_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;

-- Quantas pessoas têm cada medalha.
create or replace function public.admin_medals()
returns table (medalha text, pessoas bigint, ultima timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query
  select medal_id, count(*), max(unlocked_at) from public.user_medals group by medal_id order by count(*) desc;
end $$;

-- Painel chama só logado; o app comum não tem motivo para chamar nenhuma delas.
do $$
declare f text;
begin
  foreach f in array array[
    'admin_overview()', 'admin_users(text, integer, integer, text)', 'admin_user(uuid)',
    'admin_set_role(uuid, public.user_role)', 'admin_hide_user_content(uuid)',
    'admin_push_list(integer)', 'admin_push_create(text, text, timestamptz, text, integer)',
    'admin_push_cancel(bigint)', 'admin_push_alcance(integer)',
    'admin_ratings(text, text, integer, integer)', 'admin_messages(text, text, integer, integer)',
    'admin_occurrences(text, integer, integer)',
    'admin_set_status(public.report_target, uuid, public.content_status)',
    'admin_places(integer, text, text, integer, integer)',
    'admin_place_save(uuid, text, public.place_category, text, double precision, double precision, public.content_status, boolean)',
    'admin_place_photo(uuid, text, text)', 'admin_services()',
    'admin_service_save(integer, text, public.service_kind, text, text, text, integer, char, boolean)',
    'admin_settings()', 'admin_setting_set(text, jsonb)', 'admin_medals()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
