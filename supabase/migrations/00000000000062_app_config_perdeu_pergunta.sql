-- app_config() voltava sem pergunta_semana (05/10/2026, achado pelo Alysson: pergunta ativa no
-- painel mas não aparecia no app). Bug introduzido na migration 56: ao recriar app_config() pra
-- somar irise_ativa, a lista ficou só ('aviso', 'irise_ativa') e perdeu 'pergunta_semana', que a
-- migration 43 tinha colocado. Mural de Apoio sem a chave: a pergunta nunca aparecia.
create or replace function public.app_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.app_settings where key in ('aviso', 'irise_ativa', 'pergunta_semana');
$$;
revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated;
