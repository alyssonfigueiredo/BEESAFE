-- Diagnóstico: o que sumiu, e por quê.
select 'avaliações no banco'          as o_que, count(*)::text as quanto from public.place_ratings
union all select 'avaliações escondidas por denúncia', count(*)::text from public.place_ratings where status <> 'active'
union all select 'avaliações sem dono (conta excluída)', count(*)::text from public.place_ratings where user_id is null
union all select 'lugares cadastrados por usuário', count(*)::text from public.places where created_by is not null
union all select 'lugares sem dono (conta excluída)', count(*)::text from public.places where created_by is null and verified = false
union all select 'lugares escondidos por denúncia', count(*)::text from public.places where status <> 'active'
union all select 'contas que existem hoje', count(*)::text from auth.users
union all select 'denúncias abertas', count(*)::text from public.content_reports where status = 'open'
union all select 'bloqueios feitos', count(*)::text from public.blocked_users;
