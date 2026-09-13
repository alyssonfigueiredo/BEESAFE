-- Fase 4: denúncias de conteúdo, auto-ocultação, rate limit e moderação.

create type public.report_target as enum ('occurrence', 'place', 'rating', 'message');
create type public.report_status as enum ('open', 'accepted', 'rejected');

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  status public.report_status not null default 'open',
  moderator_id uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);
create index content_reports_open_idx on public.content_reports (status, created_at desc);

alter table public.content_reports enable row level security;
create policy "reports: denunciar" on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "reports: moderação lê" on public.content_reports for select to authenticated
  using (public.is_moderator());
create policy "reports: moderação resolve" on public.content_reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- ---------- rate limit ----------
-- Limites por usuário em 24 h. Conta antes do insert; falha com mensagem clara.
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer; v_age interval;
begin
  v_limit := case tg_table_name
    when 'occurrences' then 5
    when 'place_ratings' then 10
    when 'support_messages' then 20
    when 'places' then 5
    when 'content_reports' then 20
    else 50 end;

  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''24 hours''',
                 tg_table_name, tg_argv[0])
    into v_count using auth.uid();
  if v_count >= v_limit then
    raise exception 'Limite de % por dia atingido. Tente amanhã.', v_limit using errcode = 'P0002';
  end if;

  -- Conta com menos de 24 h não cria lugares (evita spam de contas novas).
  if tg_table_name = 'places' then
    select now() - created_at into v_age from public.profiles where id = auth.uid();
    if v_age < interval '24 hours' then
      raise exception 'Contas novas podem adicionar lugares após 24 horas.' using errcode = 'P0003';
    end if;
  end if;
  return new;
end $$;

create trigger occurrences_rate_limit before insert on public.occurrences
  for each row execute function public.enforce_rate_limit('created_by');
create trigger places_rate_limit before insert on public.places
  for each row execute function public.enforce_rate_limit('created_by');
create trigger place_ratings_rate_limit before insert on public.place_ratings
  for each row execute function public.enforce_rate_limit('user_id');
create trigger support_messages_rate_limit before insert on public.support_messages
  for each row execute function public.enforce_rate_limit('created_by');
create trigger content_reports_rate_limit before insert on public.content_reports
  for each row execute function public.enforce_rate_limit('reporter_id');

-- ---------- auto-ocultação ----------
-- 3 denúncias abertas de pessoas diferentes escondem o conteúdo até revisão.
create or replace function public.set_content_status(p_type public.report_target, p_id uuid, p_status public.content_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  case p_type
    when 'occurrence' then update public.occurrences set status = p_status where id = p_id;
    when 'place' then update public.places set status = p_status where id = p_id;
    when 'rating' then update public.place_ratings set status = p_status where id = p_id;
    when 'message' then update public.support_messages set status = p_status where id = p_id;
  end case;
end $$;

create or replace function public.on_report_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_open integer;
begin
  select count(distinct reporter_id) into v_open from public.content_reports
  where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if v_open >= 3 then
    perform public.set_content_status(new.target_type, new.target_id, 'hidden');
  end if;
  return new;
end $$;

create trigger content_reports_autohide after insert on public.content_reports
  for each row execute function public.on_report_created();

-- ---------- moderação ----------
-- Fila: denúncias abertas com um resumo do alvo (nunca o autor).
create or replace function public.moderation_queue(p_limit integer default 50)
returns table (
  target_type public.report_target, target_id uuid, reports bigint, first_reported timestamptz,
  reasons text[], summary text, current_status public.content_status
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Somente moderação' using errcode = '42501'; end if;
  return query
  select r.target_type, r.target_id, count(*) as reports, min(r.created_at) as first_reported,
         array_agg(r.reason order by r.created_at) as reasons,
         case r.target_type
           when 'occurrence' then (select o.type::text || ' · ' || coalesce(left(o.description, 120), '') from public.occurrences o where o.id = r.target_id)
           when 'place' then (select p.name from public.places p where p.id = r.target_id)
           when 'rating' then (select pr.stars || '★ ' || coalesce(left(pr.comment, 120), '') from public.place_ratings pr where pr.id = r.target_id)
           when 'message' then (select left(m.content, 120) from public.support_messages m where m.id = r.target_id)
         end as summary,
         case r.target_type
           when 'occurrence' then (select o.status from public.occurrences o where o.id = r.target_id)
           when 'place' then (select p.status from public.places p where p.id = r.target_id)
           when 'rating' then (select pr.status from public.place_ratings pr where pr.id = r.target_id)
           when 'message' then (select m.status from public.support_messages m where m.id = r.target_id)
         end as current_status
  from public.content_reports r
  where r.status = 'open'
  group by r.target_type, r.target_id
  order by count(*) desc, min(r.created_at)
  limit p_limit;
end $$;

-- Decisão: aceita (remove/oculta) ou rejeita (restaura) todas as denúncias do alvo.
create or replace function public.moderate(p_type public.report_target, p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Somente moderação' using errcode = '42501'; end if;
  if p_action = 'remove' then
    perform public.set_content_status(p_type, p_id, 'removed');
    update public.content_reports set status = 'accepted', moderator_id = auth.uid(), resolved_at = now()
      where target_type = p_type and target_id = p_id and status = 'open';
  elsif p_action = 'restore' then
    perform public.set_content_status(p_type, p_id, 'active');
    update public.content_reports set status = 'rejected', moderator_id = auth.uid(), resolved_at = now()
      where target_type = p_type and target_id = p_id and status = 'open';
  else
    raise exception 'Ação inválida: %', p_action;
  end if;
end $$;

create or replace function public.verify_place(p_id uuid, p_verified boolean)
returns void language sql security invoker as $$
  update public.places set verified = p_verified where id = p_id;
$$;
