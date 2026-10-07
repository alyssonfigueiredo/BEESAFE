-- Enviar foto do lugar pelo app dava "new row violates row-level security policy" (06/10/2026,
-- achado pelo Leandro). O app sobe com `upsert: true` (a pessoa pode trocar a própria foto, mesmo
-- caminho), e no Storage o upsert é INSERT ... ON CONFLICT DO UPDATE ... RETURNING: precisa de
-- policy de SELECT além de INSERT e UPDATE. A migration 24 só criou insert/update/delete; o bucket
-- ser público serve a URL pública, não o RLS de storage.objects. Mesma coisa que a 36 já fez
-- para os avatares. Leitura só da própria pasta (e da pasta da equipe para a moderação).
drop policy if exists "fotos: vê a sua" on storage.objects;
create policy "fotos: vê a sua" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-lugares' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "fotos: equipe vê" on storage.objects;
create policy "fotos: equipe vê" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-lugares' and (storage.foldername(name))[1] = 'equipe' and public.is_moderator());
