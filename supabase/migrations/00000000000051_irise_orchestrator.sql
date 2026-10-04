-- Irise, arquitetura de orquestração (04/10/2026): Groq decide a conversa/intenção e devolve a
-- resposta final; Gemini ranqueia e explica os candidatos reais que o banco já achou. Nenhum dos
-- dois nunca aparece pro usuário — pra quem usa o app, é só "Irise".
--
-- Esta migration só prepara o terreno pro terceiro cérebro (inteligência da comunidade, projeto
-- Código Não Binário): a tabela fica pronta, mas **vazia e sem gravação automática** até o modelo
-- exato ser definido. Enquanto isso, a Irise nunca cita "percepção da comunidade" — só o que já
-- existe de verdade (nota, selo, eixos).

create table public.place_community_signals (
  place_id uuid not null references public.places (id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 60),
  sentiment text not null check (sentiment in ('positive', 'negative', 'mixed', 'neutral')),
  confidence numeric not null check (confidence between 0 and 1),
  computed_at timestamptz not null default now(),
  primary key (place_id, topic)
);
alter table public.place_community_signals enable row level security;
create policy "qualquer pessoa logada lê os sinais de um lugar"
  on public.place_community_signals for select using (auth.uid() is not null);
comment on table public.place_community_signals is
  'Resumo do que as avaliações de um lugar revelam em conjunto (ex.: "acolhimento: positivo, 0.89").
   Nunca grava texto original de avaliação, só o sinal agregado. Fica vazia até o modelo de
   inteligência da comunidade (projeto Código Não Binário) ser definido e publicado — sem linha
   nenhuma aqui, a Irise simplesmente não menciona percepção da comunidade.';

create or replace function public.place_community_signals(p_place_id uuid)
returns table (topic text, sentiment text, confidence numeric)
language sql stable security invoker as $$
  select topic, sentiment, confidence
  from public.place_community_signals
  where place_id = p_place_id
  order by confidence desc
  limit 5;
$$;
revoke all on function public.place_community_signals(uuid) from public, anon;
grant execute on function public.place_community_signals(uuid) to authenticated;
