-- Ajuste de voz da Irise pelo painel, sem deploy (04/10/2026, pedido do Alysson: ele não quer
-- depender do Supabase CLI toda vez que quiser mudar o tom da conversa). O texto-base da Irise
-- (regras de segurança, quando chamar a ferramenta de busca etc.) continua só no código da Edge
-- Function — isso aqui é só um texto extra de voz/personalidade, colado depois do texto-base,
-- editável em Ajustes → Chaves de API → Voz da Irise. Em branco, a Irise usa só o texto-base.

insert into public.app_settings (key, value) values
  ('irise_voz_extra', '""'::jsonb)
on conflict (key) do nothing;

create or replace function public.admin_setting_set(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  if p_key not in ('aviso', 'abre_alas_ate', 'pergunta_semana', 'irise_ativa', 'irise_voz_extra') then
    raise exception 'Configuração desconhecida: %', p_key;
  end if;
  insert into public.app_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;
