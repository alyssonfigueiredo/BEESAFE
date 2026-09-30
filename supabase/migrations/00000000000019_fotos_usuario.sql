alter table public.places
  add column photo_url text,
  add column photo_source text check (photo_source in ('mapillary', 'usuario', 'wikimedia')),
  add column photo_credit text,
  add column photo_credit_uri text,
  add column photo_at timestamptz,
  add column photo_tried_at timestamptz;

comment on column public.places.photo_url is
  'Foto que é nossa de verdade (R2). Não vence: ao contrário da do Google, pode ficar guardada.';

create index places_sem_foto_idx on public.places (city_id)
  where status = 'active' and photo_url is null;

create or replace view public.public_places with (security_invoker = false) as
select p.id, p.name, p.category, p.address, p.city_id, p.neighborhood_id,
       n.name as neighborhood, c.name as city, c.state, p.verified, p.created_at,
       st_y(p.location::geometry) as latitude, st_x(p.location::geometry) as longitude,
       s.score, s.rating_count, s.recent_occurrences, s.recent_high_occurrences, s.flagged,
       s.score_welcome, s.score_affection, s.score_restroom, s.score_crowd,
       s.rating_stddev, s.recent_on_site, s.badge,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_name end as photo_name,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_author end as photo_author,
       case when p.google_photo_at > now() - interval '30 days' then p.google_photo_author_uri end as photo_author_uri,
       s.area_score, s.area_level,
       p.photo_url, p.photo_source, p.photo_credit, p.photo_credit_uri
from public.places p
join public.cities c on c.id = p.city_id
left join public.neighborhoods n on n.id = p.neighborhood_id
left join public.place_scores s on s.place_id = p.id
where p.status = 'active';

revoke all on public.public_places from anon;
grant select on public.public_places to authenticated;

drop function if exists public.welcoming_ranking(integer, integer);
create function public.welcoming_ranking(p_city_id integer, p_limit integer default 10)
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
         photo_name, photo_author, photo_author_uri,
         photo_url, photo_source, photo_credit, photo_credit_uri
  from public.public_places
  where city_id = p_city_id and rating_count >= 5 and score is not null
    and coalesce(badge, '') <> 'atencao'
  order by score desc, rating_count desc
  limit p_limit;
$$;

revoke all on function public.welcoming_ranking(integer, integer) from anon;
grant execute on function public.welcoming_ranking(integer, integer) to authenticated;

drop function if exists public.neighborhood_places(integer, integer);
create function public.neighborhood_places(p_neighborhood_id integer, p_limit integer default 20)
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
         photo_name, photo_author, photo_author_uri,
         photo_url, photo_source, photo_credit, photo_credit_uri
  from public.public_places
  where neighborhood_id = p_neighborhood_id
  order by (rating_count > 0) desc, score desc nulls last, rating_count desc, name
  limit p_limit;
$$;

revoke all on function public.neighborhood_places(integer, integer) from anon;
grant execute on function public.neighborhood_places(integer, integer) to authenticated;



insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-lugares', 'fotos-lugares', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "fotos: manda a sua" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-lugares'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "fotos: troca a sua" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-lugares' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'fotos-lugares' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "fotos: apaga a sua" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-lugares' and (storage.foldername(name))[2] = auth.uid()::text);

create table public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  url text not null,
  path text not null,
  status public.content_status not null default 'active',
  review text not null default 'pendente' check (review in ('pendente', 'aprovada', 'recusada', 'humano')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);
create index place_photos_fila_idx on public.place_photos (review, created_at)
  where review in ('pendente', 'humano');
create index place_photos_place_idx on public.place_photos (place_id, status, created_at desc);

alter table public.place_photos enable row level security;
create policy "fotos: vê as liberadas" on public.place_photos for select to authenticated
  using (
    (status = 'active' and review = 'aprovada')
    or user_id = (select auth.uid())
    or public.is_moderator()
  );
create policy "fotos: manda a sua" on public.place_photos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "fotos: troca a sua" on public.place_photos for update to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator())
  with check (user_id = (select auth.uid()) or public.is_moderator());
create policy "fotos: apaga a sua" on public.place_photos for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator());

create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer; v_age interval;
begin
  v_limit := case tg_table_name
    when 'occurrences' then 5
    when 'place_ratings' then 10
    when 'place_photos' then 10
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

  if tg_table_name = 'places' then
    select now() - created_at into v_age from public.profiles where id = auth.uid();
    if v_age < interval '24 hours' then
      raise exception 'Contas novas podem adicionar lugares após 24 horas.' using errcode = 'P0003';
    end if;
  end if;
  return new;
end $$;

create trigger place_photos_rate_limit
  before insert on public.place_photos
  for each row execute function public.enforce_rate_limit('user_id');

create or replace function public.refresh_place_photo(p_place_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.place_photos;
begin
  select * into v from public.place_photos
  where place_id = p_place_id and status = 'active' and review = 'aprovada'
  order by created_at desc limit 1;

  if found then
    update public.places
    set photo_url = v.url, photo_source = 'usuario',
        photo_credit = 'Foto de quem avaliou', photo_credit_uri = null,
        photo_at = v.created_at
    where id = p_place_id;
  else
    update public.places
    set photo_url = null, photo_source = null, photo_credit = null,
        photo_credit_uri = null, photo_at = null
    where id = p_place_id and photo_source = 'usuario';
  end if;
end $$;

create or replace function public.place_photos_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_place_photo(coalesce(new.place_id, old.place_id));
  return null;
end $$;

create trigger place_photos_sync_trg
  after insert or update or delete on public.place_photos
  for each row execute function public.place_photos_sync();

alter type public.report_target add value if not exists 'photo';

create or replace function public.fotos_para_moderar(p_limit integer default 50)
returns table (id uuid, place_id uuid, place_name text, url text, review text, review_note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, f.place_id, p.name, f.url, f.review, f.review_note, f.created_at
  from public.place_photos f
  join public.places p on p.id = f.place_id
  where public.is_moderator() and f.review in ('pendente', 'humano', 'recusada')
  order by (f.review = 'humano') desc, f.created_at
  limit p_limit;
$$;

revoke all on function public.fotos_para_moderar(integer) from anon, authenticated;
grant execute on function public.fotos_para_moderar(integer) to authenticated;

create or replace function public.moderar_foto(p_id uuid, p_aprovar boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    raise exception 'Só a moderação faz isso.' using errcode = 'P0001';
  end if;
  update public.place_photos
  set review = case when p_aprovar then 'aprovada' else 'recusada' end,
      review_note = coalesce(review_note, '') || ' · decidido por pessoa',
      reviewed_at = now()
  where id = p_id;
end $$;

revoke all on function public.moderar_foto(uuid, boolean) from anon, authenticated;
grant execute on function public.moderar_foto(uuid, boolean) to authenticated;

create extension if not exists pg_net;

select cron.unschedule('photo-check') where exists (select 1 from cron.job where jobname = 'photo-check');
select cron.schedule('photo-check', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://ntjirpqulrnieeglpiei.supabase.co/functions/v1/photo-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'photo_check_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from public.place_photos where review = 'pendente');
$$);
