-- Prévia do personagem do irise ganhou mais fotos reais (09/10/2026): o limite de 1 a 7 (migration 66)
-- já estava furado — os personagens 8 e 9 (Bruno e Igor) tinham sido adicionados ao app sem atualizar
-- aqui, e teriam sido recusados por esta função se alguém tivesse testado com login de verdade.
-- Sobe a faixa pra caber o conjunto todo (até 30, com folga pra próximos lotes de fotos) sem precisar
-- de outra migration a cada leva nova.
alter table public.profiles drop constraint if exists profiles_irise_personagem_check;
alter table public.profiles add constraint profiles_irise_personagem_check
  check (irise_personagem between 1 and 30);

create or replace function public.set_my_irise_personagem(p_personagem smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sua sessão expirou. Saia e entre de novo.' using errcode = '28000'; end if;
  if p_personagem is not null and p_personagem not between 1 and 30 then
    raise exception 'Personagem inválido.';
  end if;
  update public.profiles set irise_personagem = p_personagem where id = auth.uid();
end $$;
revoke all on function public.set_my_irise_personagem(smallint) from public, anon;
grant execute on function public.set_my_irise_personagem(smallint) to authenticated;
