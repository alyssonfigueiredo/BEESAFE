-- Botão da Irise escondido por padrão (04/10/2026, pedido do Alysson): o código já está pronto e
-- publicado, mas o botão só aparece no app quando app_settings.irise_ativa = true. Dá pra ligar
-- com calma, depois de configurar as chaves e testar com tranquilidade — sem build nem EAS Update
-- novo, é só uma chave de configuração (igual ao aviso do Início).

insert into public.app_settings (key, value) values
  ('irise_ativa', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.app_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.app_settings where key in ('aviso', 'irise_ativa');
$$;
revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated;

create or replace function public.admin_setting_set(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_key not in ('aviso', 'abre_alas_ate', 'pergunta_semana', 'irise_ativa') then
    raise exception 'Configuração desconhecida: %', p_key;
  end if;
  insert into public.app_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;
