-- Resposta automática a comentário no Instagram (migration 67). Colar no SQL Editor, um bloco por vez.
-- "Gatilho" é comparado sem acento e minúsculo; a primeira regra ativa que aparecer no comentário
-- responde. Deixar sem gatilho nenhum ativo == a automação não responde nada.
-- Já ligadas hoje: comentário com 🌈 ou com ✨ (ids 1 e 2).

-- Ver as regras de hoje
select id, gatilho, resposta, ativo from public.ig_reply_rules order by id;

-- Criar uma regra nova (ligada)
insert into public.ig_reply_rules (gatilho, resposta, ativo) values
  ('alguma palavra', 'Texto da resposta automática 🌈', true);

-- Desligar uma regra sem apagar (troca o id)
update public.ig_reply_rules set ativo = false where id = 1;

-- Editar o texto de uma regra
update public.ig_reply_rules set resposta = 'Novo texto aqui 🌈' where id = 1;

-- Apagar de vez
delete from public.ig_reply_rules where id = 1;

-- Quantos comentários já foram respondidos, e os últimos 20
select count(*) from public.ig_auto_replies;
select respondido_em, texto_recebido, regra_id from public.ig_auto_replies order by respondido_em desc limit 20;
