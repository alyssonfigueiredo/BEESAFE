-- Quais destes lugares eu já avaliei. O cartão "Sua cidade" do Início só convida para lugares que a
-- pessoa ainda pode ajudar: sugerir "falta 1" num lugar que ela já avaliou é convite sem saída.
-- Devolve só ids (nunca nota, nunca comentário) e só os da própria pessoa.
create or replace function public.my_rated_places(p_ids uuid[])
returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct r.place_id from public.place_ratings r
  where r.user_id = auth.uid() and r.status = 'active' and r.place_id = any(p_ids);
$$;
revoke all on function public.my_rated_places(uuid[]) from public, anon;
grant execute on function public.my_rated_places(uuid[]) to authenticated;
