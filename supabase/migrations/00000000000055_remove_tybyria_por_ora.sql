-- Pausa a TybyrIA (migration 52) por decisão do Alysson (04/10/2026): só seguir com integrações
-- cujo custo grátis já está 100% confirmado. O Hugging Face tem um plano grátis real (US$0,10 de
-- crédito/mês, sem cobrança automática sem cartão cadastrado), mas por ora fica de fora — pode
-- voltar depois como nova migration, sem perder nada: nenhuma avaliação ou mensagem foi escondida
-- por isso (a TybyrIA nunca chegou a rodar de verdade, só a estrutura tinha sido criada).

select cron.unschedule('tybyria-check') where exists (select 1 from cron.job where jobname = 'tybyria-check');

drop function if exists public.tybyria_registrar(public.report_target, uuid, numeric, boolean);
drop function if exists public.tybyria_pendentes(integer);
drop function if exists public.tybyria_autorizado(text);
drop table if exists public.tybyria_checks;

-- Segredo do cron (tybyria_secret) fica sem uso, sem problema nenhum deixar no Vault.
