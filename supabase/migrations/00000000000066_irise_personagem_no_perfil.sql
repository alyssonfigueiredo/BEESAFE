-- Personagem do irise, escolhido no Perfil (06/10/2026, retorno do Alysson sobre a prévia): sem
-- XP, sem aparecer em toda aba — só o avatar do personagem escolhido no chat da Irise. 1 a 7, livre
-- pra trocar quando quiser; null = segue sem personagem (o chat de hoje, sem rosto).
alter table public.profiles
  add column if not exists irise_personagem smallint check (irise_personagem between 1 and 7);

create or replace function public.set_my_irise_personagem(p_personagem smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sua sessão expirou. Saia e entre de novo.' using errcode = '28000'; end if;
  if p_personagem is not null and p_personagem not between 1 and 7 then
    raise exception 'Personagem inválido.';
  end if;
  update public.profiles set irise_personagem = p_personagem where id = auth.uid();
end $$;
revoke all on function public.set_my_irise_personagem(smallint) from public, anon;
grant execute on function public.set_my_irise_personagem(smallint) to authenticated;
