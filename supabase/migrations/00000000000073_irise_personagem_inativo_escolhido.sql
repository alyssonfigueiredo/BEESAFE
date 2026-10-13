-- Quem já escolheu um personagem que depois foi desativado continua vendo o seu (Perfil, chat,
-- Início). Antes a leitura só devolvia os ativos e o personagem sumia do app para essa pessoa.
drop policy if exists "irise personagens: todo mundo vê os ativos" on public.irise_personagens;
create policy "irise personagens: todo mundo vê os ativos" on public.irise_personagens
  for select to anon, authenticated
  using (ativo or n = (select irise_personagem from public.profiles where id = (select auth.uid())));
