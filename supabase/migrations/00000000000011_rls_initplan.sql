-- Migration 11: tira auth.uid() e is_moderator() de dentro do laço por linha.
-- Sem o (select ...), o Postgres reavalia a função a cada linha examinada pela policy.
-- Com o (select ...), vira InitPlan: roda uma vez por consulta. É o aviso
-- "Auth RLS Initialization Plan" do linter da Supabase. Só desempenho — as regras
-- são exatamente as mesmas de antes.

-- profiles
drop policy if exists "profiles: próprio perfil" on public.profiles;
create policy "profiles: próprio perfil" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists "profiles: editar próprio" on public.profiles;
create policy "profiles: editar próprio" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid())
              and role = (select role from public.profiles where id = (select auth.uid())));

-- occurrences
drop policy if exists "occurrences: inserir como si mesmo" on public.occurrences;
create policy "occurrences: inserir como si mesmo" on public.occurrences for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists "occurrences: moderação lê tudo" on public.occurrences;
create policy "occurrences: moderação lê tudo" on public.occurrences for select to authenticated
  using ((select public.is_moderator()));
drop policy if exists "occurrences: moderação edita status" on public.occurrences;
create policy "occurrences: moderação edita status" on public.occurrences for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- places
drop policy if exists "places: leitura de ativos" on public.places;
create policy "places: leitura de ativos" on public.places for select to authenticated
  using (status = 'active' or (select public.is_moderator()));
drop policy if exists "places: criar como si mesmo" on public.places;
create policy "places: criar como si mesmo" on public.places for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists "places: moderação edita" on public.places;
create policy "places: moderação edita" on public.places for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- place_ratings
drop policy if exists "ratings: leitura de ativas" on public.place_ratings;
create policy "ratings: leitura de ativas" on public.place_ratings for select to authenticated
  using (status = 'active' or user_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists "ratings: criar a própria" on public.place_ratings;
create policy "ratings: criar a própria" on public.place_ratings for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "ratings: editar a própria" on public.place_ratings;
create policy "ratings: editar a própria" on public.place_ratings for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()))
  with check (user_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists "ratings: apagar a própria" on public.place_ratings;
create policy "ratings: apagar a própria" on public.place_ratings for delete to authenticated
  using (user_id = (select auth.uid()));

-- support_messages
drop policy if exists "messages: criar como si mesmo" on public.support_messages;
create policy "messages: criar como si mesmo" on public.support_messages for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists "messages: moderação lê" on public.support_messages;
create policy "messages: moderação lê" on public.support_messages for select to authenticated
  using ((select public.is_moderator()));
drop policy if exists "messages: moderação edita" on public.support_messages;
create policy "messages: moderação edita" on public.support_messages for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- support_likes
drop policy if exists "likes: os meus" on public.support_likes;
create policy "likes: os meus" on public.support_likes for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "likes: curtir" on public.support_likes;
create policy "likes: curtir" on public.support_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "likes: descurtir" on public.support_likes;
create policy "likes: descurtir" on public.support_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- support_services
drop policy if exists "services: moderação edita" on public.support_services;
create policy "services: moderação edita" on public.support_services for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- content_reports
drop policy if exists "reports: denunciar" on public.content_reports;
create policy "reports: denunciar" on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
drop policy if exists "reports: moderação lê" on public.content_reports;
create policy "reports: moderação lê" on public.content_reports for select to authenticated
  using ((select public.is_moderator()));
drop policy if exists "reports: moderação resolve" on public.content_reports;
create policy "reports: moderação resolve" on public.content_reports for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
