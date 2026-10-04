-- Painel → Chaves de API (04/10/2026): lugar pra gravar GROQ_API_KEY, GEMINI_API_KEY e
-- HF_API_TOKEN sem precisar abrir o dashboard do Supabase. A chave fica no Vault (criptografada,
-- mesmo lugar do push_secret) — ninguém, nem admin, consegue ler de volta pelo painel, só
-- sobrescrever. As Edge Functions (irise-orchestrator, tybyria-check) buscam por aqui quando não
-- têm a chave configurada direto nos secrets delas.

create or replace function public.admin_set_api_key(p_name text, p_value text)
returns void language plpgsql security definer set search_path = public, vault, extensions as $$
begin
  if not public.is_admin() then raise exception 'Somente admin' using errcode = '42501'; end if;
  if p_name not in ('GROQ_API_KEY', 'GEMINI_API_KEY', 'HF_API_TOKEN') then
    raise exception 'Chave desconhecida: %', p_name;
  end if;
  if coalesce(btrim(p_value), '') = '' then
    raise exception 'Cole a chave antes de salvar.';
  end if;

  -- Apaga a versão antiga (se houver) e cria de novo: mais simples que update_secret e funciona
  -- igual na primeira vez e numa troca.
  delete from vault.secrets where name = p_name;
  perform vault.create_secret(btrim(p_value), p_name);
end $$;
revoke all on function public.admin_set_api_key(text, text) from public, anon;
grant execute on function public.admin_set_api_key(text, text) to authenticated;

-- Só diz se cada chave está configurada (true/false) — nunca devolve o valor.
create or replace function public.admin_api_keys_status()
returns table (name text, configurado boolean)
language plpgsql stable security definer set search_path = public, vault as $$
begin
  if not public.is_admin() then raise exception 'Somente admin' using errcode = '42501'; end if;
  return query
    select n, exists (select 1 from vault.secrets s where s.name = n)
    from unnest(array['GROQ_API_KEY', 'GEMINI_API_KEY', 'HF_API_TOKEN']) as n;
end $$;
revoke all on function public.admin_api_keys_status() from public, anon;
grant execute on function public.admin_api_keys_status() to authenticated;

-- Só a Edge Function (chave de serviço) consegue de fato ler o valor decifrado.
create or replace function public.get_secret_for_function(p_name text)
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name;
$$;
revoke all on function public.get_secret_for_function(text) from public, anon, authenticated;
grant execute on function public.get_secret_for_function(text) to service_role;
