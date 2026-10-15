-- Teto diário do plano grátis do Groq para o openai/gpt-oss-120b (print do console do Leandro,
-- 14/10/2026): 30 pedidos/min, 1.000 pedidos/dia, 8 mil tokens/min, 200 mil tokens/dia. Vira a
-- referência da barra em Painel → Uso do irise (só se ninguém tiver posto outro número).
update public.app_settings set value = '200000'::jsonb, updated_at = now()
where key = 'irise_limite_tokens_dia' and (value is null or value = 'null'::jsonb);
