-- Foto de perfil. É só da própria pessoa: aparece na tela Perfil dela e em lugar nenhum mais
-- (mural, avaliações e relatos continuam sem rosto), então não passa por moderação. Por isso o
-- bucket é PRIVADO: a leitura é por URL assinada, só de quem é dono da pasta.
-- Caminho: `<user_id>/avatar.jpg`.

alter table public.profiles add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "avatares: vê o seu" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatares: manda o seu" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatares: troca o seu" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatares: apaga o seu" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- Grava (ou limpa, com null) o caminho da foto. Só aceita caminho dentro da própria pasta.
create or replace function public.set_my_avatar(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sua sessão expirou. Saia e entre de novo.' using errcode = '28000';
  end if;
  if p_path is not null and p_path not like v_uid::text || '/%' then
    raise exception 'Caminho de foto inválido.' using errcode = '22023';
  end if;
  insert into public.profiles (id, avatar_path) values (v_uid, p_path)
  on conflict (id) do update set avatar_path = excluded.avatar_path;
end;
$$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
