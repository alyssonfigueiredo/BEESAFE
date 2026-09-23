-- Testadores que se inscreveram pelo site. Cole no SQL Editor do Supabase.

-- 1) E-mails Android ainda não colados na Play Console, já separados por vírgula:
--    copie a célula e cole em Play Console → Teste fechado → Testadores → lista "Testadores" → adicionar e-mails.
select count(*) as novos, string_agg(email, ', ' order by created_at) as emails
from public.tester_signups
where platform = 'android' and added_at is null;

-- 2) Depois de colar e SALVAR na Play Console (e enviar as mudanças para análise), marque como adicionados:
-- update public.tester_signups set added_at = now() where platform = 'android' and added_at is null;

-- 3) Quem pediu aviso do iPhone:
-- select string_agg(email, ', ' order by created_at) from public.tester_signups where platform = 'ios';

-- 4) Visão geral:
-- select platform, count(*) filter (where added_at is null) as pendentes, count(*) as total from public.tester_signups group by 1;
