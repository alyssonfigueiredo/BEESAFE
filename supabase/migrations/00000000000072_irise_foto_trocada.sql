-- Foto trocada pelo admin não aparecia em 3 peças da Início (10/10/2026, achado na revisão).
-- `CardCidadeIrise`, `FaixaSempreOnline` e `IrisePilula` sempre usavam a imagem embutida de fundo
-- escuro pros 9 personagens originais, mesmo depois de o admin trocar a foto pelo painel — só o
-- avatar circular comum (`Busto`/`IriseAvatar`) ia buscar a nova no Storage.
--
-- Segundo problema, de raiz: `atualizado_em` é tocado por QUALQUER edição (o trigger
-- `irise_personagens_tocar_trg` dispara em todo update), inclusive mudar só a bio. `tocado` em
-- `useBustoResolvido`/`useCorpoResolvido` usava isso pra decidir se tentava o Storage — editar só o
-- texto de um dos 9 originais já fazia o app procurar uma foto que não existe lá.
--
-- Fica uma coluna só pra foto: `admin_irise_personagem_tocar` (chamada depois de subir uma foto,
-- nunca pelo upsert de texto) grava nela. O app passa a decidir pelo foto_atualizada_em.

alter table public.irise_personagens add column foto_atualizada_em timestamptz null;

create or replace function public.admin_irise_personagem_tocar(p_n smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard(true);
  update public.irise_personagens set foto_atualizada_em = now() where n = p_n;
end $$;
