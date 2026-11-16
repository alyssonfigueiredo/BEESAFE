-- A pergunta do banheiro pode ficar em branco (14/11/2026, decisão do Leandro): quem não usou o
-- banheiro era obrigado a inventar uma resposta, e o carrossel de 14/11 já dizia "pode pular".
-- As outras três continuam obrigatórias. Sem banheiro, a nota da avaliação usa os outros três
-- pesos na mesma proporção (0,30 / 0,30 / 0,15, divididos por 0,75). Com banheiro, nada muda.

-- Ou as três obrigatórias, ou nenhuma (avaliação antiga, só estrela); banheiro só junto delas.
alter table public.place_ratings drop constraint if exists place_ratings_axes_complete;
alter table public.place_ratings add constraint place_ratings_axes_complete check (
  num_nonnulls(welcome, affection, crowd) in (0, 3)
  and (restroom is null or welcome is not null)
);

-- `overall` era coluna gerada; a expressão de uma gerada não se troca (só no Postgres 17).
-- Vira coluna comum, com o valor que já tem, e passa a ser preenchida pelo mesmo gatilho das estrelas.
do $$ begin
  if exists (select 1 from pg_attribute where attrelid = 'public.place_ratings'::regclass
             and attname = 'overall' and attgenerated <> '') then
    alter table public.place_ratings alter column overall drop expression;
  end if;
end $$;

create or replace function public.fill_rating_stars()
returns trigger language plpgsql as $$
begin
  if new.welcome is not null then
    new.overall := round((case
      when new.restroom is null
        then (0.30 * new.welcome + 0.30 * new.affection + 0.15 * new.crowd) / 0.75
      else 0.30 * new.welcome + 0.30 * new.affection + 0.25 * new.restroom + 0.15 * new.crowd
    end)::numeric, 2);
    new.stars := greatest(1, least(5, round(new.overall)::smallint));
  else
    new.overall := new.stars::numeric;
  end if;
  return new;
end $$;

-- Nota do banheiro do lugar: média só de quem respondeu. A função é a que estiver no banco;
-- troca-se só o denominador dessa linha.
do $$
declare
  d text;
  velho constant text := 'sum(r.restroom * r.w) / nullif(sum(r.w) filter (where r.welcome is not null), 0)';
  novo constant text := 'sum(r.restroom * r.w) / nullif(sum(r.w) filter (where r.restroom is not null), 0)';
begin
  select pg_get_functiondef('public.compute_place_score(uuid)'::regprocedure) into d;
  if position(novo in d) = 0 then
    if position(velho in d) = 0 then
      raise exception 'compute_place_score mudou: a linha da nota do banheiro não foi encontrada';
    end if;
    execute replace(d, velho, novo);
  end if;
end $$;
