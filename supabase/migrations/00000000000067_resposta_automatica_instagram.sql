-- Resposta automática a comentário no Instagram (05/10/2026): a função `ig-comment-reply` recebe o
-- webhook da Graph API a cada comentário novo, acha a primeira regra cujo gatilho aparece no texto
-- (minúsculo, sem acento) e responde. `ig_auto_replies` guarda quem já foi respondido, pra não
-- responder o mesmo comentário duas vezes se a Meta reenviar o webhook.

create table if not exists public.ig_reply_rules (
  id bigint generated always as identity primary key,
  gatilho text not null,
  resposta text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
comment on table public.ig_reply_rules is 'Regras da resposta automática: se o comentário contém "gatilho" (sem acento, minúsculo), responde "resposta". Sem policy: só o SQL Editor (dono do projeto) mexe aqui.';

create table if not exists public.ig_auto_replies (
  comment_id text primary key,
  post_id text,
  texto_recebido text,
  regra_id bigint references public.ig_reply_rules(id),
  respondido_em timestamptz not null default now()
);
comment on table public.ig_auto_replies is 'Log de comentários já respondidos pela automação — evita responder duas vezes o mesmo comentário. Sem policy: só a Edge Function (chave de serviço) grava aqui.';
