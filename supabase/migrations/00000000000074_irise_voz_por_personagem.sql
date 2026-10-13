-- Voz por personagem da Irise (10/10/2026, pedido do Alysson): o painel já tinha um campo único de
-- voz/personalidade (migration 58), colado igual pra qualquer um dos personagens escolhidos no chat
-- (profiles.irise_personagem, migration 66/70). Agora cada personagem pode ter o seu próprio texto
-- extra, somado ao texto-base (continua só no código) e ao texto geral de voz (continua valendo pra
-- todo mundo, mesmo quem está sem personagem escolhido).
-- Depende da migration 71 (irise_personagens_administraveis): valida contra o catálogo de verdade,
-- não mais um intervalo fixo (o painel já deixa criar personagem com qualquer número até 999).

insert into public.app_settings (key, value) values
  ('irise_voz_personagens', '{}'::jsonb)
on conflict (key) do nothing;

create or replace function public.admin_personagem_voz_set(p_personagem smallint, p_voz text)
returns void language plpgsql security definer set search_path = public as $$
declare v_atual jsonb;
begin
  perform public.admin_guard(true);
  if p_personagem is null or not exists (select 1 from public.irise_personagens where n = p_personagem) then
    raise exception 'Personagem inválido: %', p_personagem;
  end if;
  select value into v_atual from public.app_settings where key = 'irise_voz_personagens';
  v_atual := coalesce(v_atual, '{}'::jsonb) || jsonb_build_object(p_personagem::text, coalesce(trim(p_voz), ''));
  insert into public.app_settings (key, value, updated_at, updated_by)
  values ('irise_voz_personagens', v_atual, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;

revoke all on function public.admin_personagem_voz_set(smallint, text) from public, anon;
grant execute on function public.admin_personagem_voz_set(smallint, text) to authenticated;
