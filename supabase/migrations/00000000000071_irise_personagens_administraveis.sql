-- Personagens do irise administráveis pelo painel, sem precisar de build (10/10/2026, pedido do
-- Alysson). Até aqui os 9 personagens (nome, pronome, classe, bio, atributos e as fotos de cada
-- um) eram uma lista fixa em `src/lib/irisePersonagens.ts`, compilada no app — criar, editar ou
-- apagar um precisava mexer no código e gerar build. Agora o catálogo mora aqui; o app continua
-- trazendo os 9 de hoje embutidos como reserva (não some se faltar internet ou se o banco não
-- tiver a migration), e soma o que estiver aqui por cima.
--
-- Fotos: bucket público `irise`, caminho `<personagem>/<pose>.webp` (1 arquivo por pose, 1 a 6,
-- mesma ordem de `bustoSrc` hoje). É só a versão de fundo claro — a mesma imagem também é usada
-- em cima do card escuro da Início (o anel arco-íris e o fundo escuro são desenhados no app, do
-- jeito que já é feito pro fundo claro). Diferente do pacote de hoje, que trouxe uma versão
-- "-escuro"/"avatar-card" pronta e tratada à parte pros 9 personagens originais: gerar essas
-- versões (removedor de fundo, anel, recorte) pede composição gráfica de verdade, que não dá pra
-- fazer só com Storage + RLS. Se isso incomodar visualmente num personagem novo (o halo claro no
-- cabelo que o pacote original tratava à mão), o Alysson manda as duas versões tratadas depois e
-- alguém liga — por ora fica assim, pra não travar a entrega.

create table public.irise_personagens (
  n smallint primary key check (n between 1 and 999),
  nome text not null check (length(nome) between 1 and 30),
  pronomes text not null check (length(pronomes) between 1 and 30),
  classe text not null check (length(classe) between 1 and 40),
  bio text not null check (length(bio) between 1 and 200),
  stat_acolhimento smallint not null default 3 check (stat_acolhimento between 0 and 5),
  stat_humor smallint not null default 3 check (stat_humor between 0 and 5),
  stat_papo_reto smallint not null default 3 check (stat_papo_reto between 0 and 5),
  stat_role smallint not null default 3 check (stat_role between 0 and 5),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table public.irise_personagens is
  'Catálogo de personagens do irise administrável pelo painel. Os 9 originais (10 a 18) ficam embutidos no app como reserva; o que estiver aqui soma a eles.';

create index irise_personagens_ativo_idx on public.irise_personagens (ativo);

alter table public.irise_personagens enable row level security;
-- Leitura é catálogo público (igual a `places`, `support_services`): todo mundo vê os ativos.
create policy "irise personagens: todo mundo vê os ativos" on public.irise_personagens
  for select to anon, authenticated using (ativo);
-- Escrita só pelas funções admin_* abaixo (security definer) — sem policy de insert/update/delete.

create or replace function public.irise_personagens_tocar()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
create trigger irise_personagens_tocar_trg
  before update on public.irise_personagens
  for each row execute function public.irise_personagens_tocar();

-- Semeia os 9 personagens de hoje (mesmos dados de `src/lib/irisePersonagens.ts`), pra virarem a
-- única fonte de verdade: dali pra frente o app lê daqui, e a lista fixa no código vira só a
-- reserva (offline, ou se o banco não tiver a migration). `on conflict do nothing` pra não
-- sobrescrever se o admin já tiver editado algum destes pelo painel antes de rodar de novo.
insert into public.irise_personagens (n, nome, pronomes, classe, bio, stat_acolhimento, stat_humor, stat_papo_reto, stat_role) values
  (10, 'Kai', 'elu/delu', 'DJ do Rolê', 'Conhece toda balada acolhedora da cidade e a playlist de cada uma.', 3, 4, 3, 5),
  (11, 'Léo', 'ele/dele', 'Guardião', 'Papo reto e ombro firme. Avisa antes de você chegar num lugar furado.', 4, 3, 5, 3),
  (12, 'Ali', 'ele/dele', 'Conselheiro', 'Escuta sem julgar e sempre sabe de algum lugar por perto que vai te garantir boas risadas.', 5, 3, 3, 3),
  (13, 'Bento', 'ele/dele', 'Anfitrião', 'Faz questão de te apresentar todo mundo. Sabe o nome de metade da cidade.', 5, 4, 3, 4),
  (14, 'Dante', 'ele/dele', 'Protetor', 'Grandão, de voz mansa. Te acompanha até a porta sem fazer drama.', 4, 3, 4, 3),
  (15, 'Rafa', 'ele/dele', 'Cartógrafo', 'Nerd do mapa. Sabe a nota de cada bairro e explica sem pressa.', 4, 3, 4, 3),
  (16, 'Yara', 'ela/dela', 'Exploradora', 'Vive achando lugar novo. Te chama pra ser a primeira cor do mapa.', 3, 4, 4, 5),
  (17, 'Dandara', 'ela/dela', 'Matriarca', 'Mãe do grupo. Cuida, cobra água e pergunta se você chegou bem.', 5, 4, 4, 3),
  (18, 'Luna', 'ela/dela', 'Confidente', 'Escuta antes de opinar. Sempre acha uma frase que acalma.', 5, 3, 4, 3)
on conflict (n) do nothing;

-- O check fixo "entre 1 e 30" (migrations 66/70) barraria no banco um personagem novo com outro
-- número antes mesmo de chegar na função. Quem garante que o número é válido agora é a tabela.
alter table public.profiles drop constraint if exists profiles_irise_personagem_check;

-- `set_my_irise_personagem` só aceitava "entre 1 e 30" — um personagem novo criado pelo painel
-- com outro número ficaria com a escolha recusada. Agora valida contra quem existe e está ativo
-- na tabela, que é a mesma lista que o app mostra pra escolher.
create or replace function public.set_my_irise_personagem(p_personagem smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sua sessão expirou. Saia e entre de novo.' using errcode = '28000'; end if;
  if p_personagem is not null and not exists (
    select 1 from public.irise_personagens where n = p_personagem and ativo
  ) then
    raise exception 'Personagem inválido.';
  end if;
  update public.profiles set irise_personagem = p_personagem where id = auth.uid();
end $$;
revoke all on function public.set_my_irise_personagem(smallint) from public, anon;
grant execute on function public.set_my_irise_personagem(smallint) to authenticated;

-- ---------- bucket das fotos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('irise', 'irise', true, 2097152, array['image/webp', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/webp', 'image/png'];

create policy "irise fotos: admin manda" on storage.objects for insert to authenticated
  with check (bucket_id = 'irise' and public.is_admin());
create policy "irise fotos: admin troca" on storage.objects for update to authenticated
  using (bucket_id = 'irise' and public.is_admin())
  with check (bucket_id = 'irise' and public.is_admin());
create policy "irise fotos: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'irise' and public.is_admin());

-- ---------- painel ----------

-- Lista todos (inclusive inativos) para a tela de admin.
create or replace function public.admin_irise_personagens()
returns setof public.irise_personagens
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  return query select * from public.irise_personagens order by n;
end $$;
revoke all on function public.admin_irise_personagens() from anon, authenticated;
grant execute on function public.admin_irise_personagens() to authenticated;

-- Cria (n novo) ou atualiza (n já existe) um personagem inteiro.
create or replace function public.admin_irise_personagem_upsert(
  p_n smallint, p_nome text, p_pronomes text, p_classe text, p_bio text,
  p_acolhimento smallint, p_humor smallint, p_papo_reto smallint, p_role smallint,
  p_ativo boolean default true
)
returns public.irise_personagens
language plpgsql security definer set search_path = public as $$
declare v public.irise_personagens;
begin
  perform public.admin_guard(true);
  insert into public.irise_personagens
    (n, nome, pronomes, classe, bio, stat_acolhimento, stat_humor, stat_papo_reto, stat_role, ativo)
  values
    (p_n, p_nome, p_pronomes, p_classe, p_bio, p_acolhimento, p_humor, p_papo_reto, p_role, p_ativo)
  on conflict (n) do update set
    nome = excluded.nome, pronomes = excluded.pronomes, classe = excluded.classe, bio = excluded.bio,
    stat_acolhimento = excluded.stat_acolhimento, stat_humor = excluded.stat_humor,
    stat_papo_reto = excluded.stat_papo_reto, stat_role = excluded.stat_role, ativo = excluded.ativo
  returning * into v;
  return v;
end $$;
revoke all on function public.admin_irise_personagem_upsert(smallint, text, text, text, text, smallint, smallint, smallint, smallint, boolean) from anon, authenticated;
grant execute on function public.admin_irise_personagem_upsert(smallint, text, text, text, text, smallint, smallint, smallint, smallint, boolean) to authenticated;

-- Só avisa que as fotos de um personagem mudaram (pro `atualizado_em` servir de versão no cache
-- da imagem), sem mexer em mais nada — usada depois de subir fotos novas no Storage.
create or replace function public.admin_irise_personagem_tocar(p_n smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  update public.irise_personagens set atualizado_em = now() where n = p_n;
end $$;
revoke all on function public.admin_irise_personagem_tocar(smallint) from anon, authenticated;
grant execute on function public.admin_irise_personagem_tocar(smallint) to authenticated;

-- Apaga de vez. Quem tinha esse personagem escolhido no perfil volta pra "sem personagem" (mesma
-- tela vazia que já existe) em vez de ficar com um número que não existe mais em lugar nenhum.
create or replace function public.admin_irise_personagem_excluir(p_n smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  update public.profiles set irise_personagem = null where irise_personagem = p_n;
  delete from public.irise_personagens where n = p_n;
end $$;
revoke all on function public.admin_irise_personagem_excluir(smallint) from anon, authenticated;
grant execute on function public.admin_irise_personagem_excluir(smallint) to authenticated;
