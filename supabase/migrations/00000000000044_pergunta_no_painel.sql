-- O painel passa a salvar a pergunta da semana do mural (migration 43 criou a chave, mas
-- admin_setting_set só aceitava aviso e abre_alas_ate).
create or replace function public.admin_setting_set(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_key not in ('aviso', 'abre_alas_ate', 'pergunta_semana') then raise exception 'Configuração desconhecida: %', p_key; end if;
  insert into public.app_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;
