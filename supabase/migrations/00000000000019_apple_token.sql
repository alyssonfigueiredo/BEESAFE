-- Regra 5.1.1 da App Store: quem oferece "Entrar com a Apple" tem que revogar o token da Apple
-- quando a conta é excluída. Para revogar precisamos do refresh token, que só existe trocando o
-- authorization code do login (vale 5 minutos) na API da Apple. A Edge Function apple-token faz
-- essa troca no login e guarda aqui; a Edge Function delete-account lê, revoga na Apple e só
-- então apaga o usuário. Nenhum papel do app lê nem escreve esta tabela: só a chave de serviço.

create table public.apple_refresh_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  client_id text not null,          -- App ID (bundle id) usado no login; o mesmo vai na revogação
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.apple_refresh_tokens is 'Refresh token do Sign in with Apple, só para revogar ao excluir a conta. Acesso exclusivo das Edge Functions.';

alter table public.apple_refresh_tokens enable row level security;
-- Sem policy nenhuma: anon e authenticated não leem nem escrevem.
revoke all on public.apple_refresh_tokens from anon, authenticated;
