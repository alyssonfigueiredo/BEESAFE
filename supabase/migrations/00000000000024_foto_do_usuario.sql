-- Foto enviada por quem avalia o lugar.
--
-- É a melhor fonte de foto que existe para a Irisa: é atual, é do jeito que o lugar realmente é
-- e é da comunidade — ao contrário da do Google, que é alugada (vence em 30 dias, gasta cota até
-- para exibir) e da do Mapillary, que é fachada de rua tirada de passagem.
--
-- Como funciona: o arquivo vai para o Storage (bucket público `fotos-lugares`, caminho
-- `<place_id>/<user_id>/foto.jpg`), a linha vai para `place_photos` e um trigger põe a mais recente
-- ativa em `places.photo_url` — que é o que o app lê. Foto escondida pela moderação sai da ficha
-- na hora e o lugar volta para a foto anterior (Mapillary, Google ou o azulejo da categoria).
--
-- Anonimato: `place_photos.user_id` existe só para a pessoa poder trocar/apagar a própria foto e
-- para o rate limit. Ele nunca sai do banco — a view pública não tem a coluna, igual às
-- avaliações e ao mural.

-- 5 MB por arquivo e só imagem: o app manda JPEG comprimido, isso é folga com teto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-lugares', 'fotos-lugares', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Cada pessoa só escreve na pasta do lugar com o próprio nome de arquivo: ninguém sobrescreve
-- a foto de outra pessoa. Leitura é pública porque o bucket é público (a URL vai na ficha).
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
  -- Caminho no Storage, para apagar o arquivo junto quando a linha sai.
  path text not null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);
create index place_photos_place_idx on public.place_photos (place_id, status, created_at desc);

alter table public.place_photos enable row level security;
create policy "fotos: qualquer pessoa logada vê as ativas" on public.place_photos for select to authenticated
  using (status = 'active' or user_id = (select auth.uid()) or public.is_moderator());
create policy "fotos: manda a sua" on public.place_photos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "fotos: troca a sua" on public.place_photos for update to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator())
  with check (user_id = (select auth.uid()) or public.is_moderator());
create policy "fotos: apaga a sua" on public.place_photos for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator());

-- Rate limit do projeto (10/dia, igual às avaliações). A função conta pela coluna do argumento.
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

-- A ficha do lugar mostra a foto mais recente que está ativa. Se não houver nenhuma, o lugar
-- volta para a foto de antes (Mapillary/Google) — por isso o update limpa em vez de deixar velho.
create or replace function public.refresh_place_photo(p_place_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.place_photos;
begin
  select * into v from public.place_photos
  where place_id = p_place_id and status = 'active'
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

-- Denúncia de foto entra no mesmo fluxo de moderação das avaliações e do mural.
alter type public.report_target add value if not exists 'photo';
