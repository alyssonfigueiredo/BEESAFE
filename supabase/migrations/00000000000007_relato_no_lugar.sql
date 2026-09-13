-- Relato vinculado a um estabelecimento é uma acusação com nome e endereço: a moderação precisa
-- ver isso na fila, e a avaliação com quatro eixos não cabe mais em "3★".

create or replace function public.moderation_queue(p_limit integer default 50)
returns table (
  target_type public.report_target, target_id uuid, reports bigint, first_reported timestamptz,
  reasons text[], summary text, current_status public.content_status
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Somente moderação' using errcode = '42501'; end if;
  return query
  select r.target_type, r.target_id, count(*) as reports, min(r.created_at) as first_reported,
         array_agg(r.reason order by r.created_at) as reasons,
         case r.target_type
           when 'occurrence' then (
             select o.type::text
                    || coalesce(' · em ' || (select p.name from public.places p where p.id = o.place_id), '')
                    || ' · ' || coalesce(left(o.description, 120), '')
             from public.occurrences o where o.id = r.target_id)
           when 'place' then (select p.name from public.places p where p.id = r.target_id)
           when 'rating' then (
             select coalesce(pr.overall::text, pr.stars::text) || '/5 ' || coalesce(left(pr.comment, 120), '')
             from public.place_ratings pr where pr.id = r.target_id)
           when 'message' then (select left(m.content, 120) from public.support_messages m where m.id = r.target_id)
         end as summary,
         case r.target_type
           when 'occurrence' then (select o.status from public.occurrences o where o.id = r.target_id)
           when 'place' then (select p.status from public.places p where p.id = r.target_id)
           when 'rating' then (select pr.status from public.place_ratings pr where pr.id = r.target_id)
           when 'message' then (select m.status from public.support_messages m where m.id = r.target_id)
         end as current_status
  from public.content_reports r
  where r.status = 'open'
  group by r.target_type, r.target_id
  order by count(*) desc, min(r.created_at)
  limit p_limit;
end $$;
