-- Notificações push (migration 38). Colar no SQL Editor da Supabase, um bloco por vez.
-- Título até 65 caracteres, texto até 240. Chega em quem tem a Irisa com push (build 0.1.2 em diante)
-- e aceitou a permissão. Envio "na hora" sai em segundos; agendado, em até 5 minutos depois do horário.

-- Quantos aparelhos recebem hoje (total e por sistema)
select platform, count(*) from public.push_tokens group by rollup (platform);

-- Mandar agora para todo mundo
select public.enviar_notificacao(
  'A noite colore depois das 22h ✨',
  'Confere aqui onde somos bem-vindes 🌈'
);

-- Agendar (horário de Brasília) e abrir a aba Lugares ao tocar
select public.enviar_notificacao(
  'A noite colore depois das 22h ✨',
  'Confere aqui onde somos bem-vindes 🌈',
  '2026-10-10 21:00 America/Sao_Paulo',
  '/lugares'
);

-- Só para quem tem Curitiba como cidade no perfil
select public.enviar_notificacao(
  'A noite colore depois das 22h ✨',
  'Confere aqui onde somos bem-vindes 🌈',
  now(),
  null,
  (select id from public.cities where name = 'Curitiba' and state = 'PR')
);

-- Ver o que saiu e o que está agendado (aceitos = o Expo recebeu; falhas = aparelho recusou)
select id, status, titulo, enviar_em at time zone 'America/Sao_Paulo' as quando,
       aparelhos, aceitos, falhas, erro
from public.push_envios order by id desc limit 20;

-- Cancelar um agendado (troque o 1 pelo id)
update public.push_envios set status = 'cancelada' where id = 1 and status = 'agendada';
