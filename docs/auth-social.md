# Login com Google e Apple — configuração (feita por você, uma vez)

## Google

1. console.cloud.google.com → crie um projeto "Irisa" → APIs e serviços → Tela de consentimento OAuth (Externo, nome Irisa, e-mail de suporte).
2. Credenciais → Criar credenciais → ID do cliente OAuth → tipo **Aplicativo da Web**.
   - URIs de redirecionamento autorizados: `https://ntjirpqulrnieeglpiei.supabase.co/auth/v1/callback`
3. Copie Client ID e Client Secret.
4. Supabase → Authentication → Providers → Google: ligue, cole Client ID e Secret, salve.
5. Supabase → Authentication → URL Configuration → Redirect URLs: adicione `irisa://auth/callback`.

## Apple (só quando tiver a conta Apple Developer)

1. developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → App ID `br.com.irisa.app` com a capability **Sign In with Apple**.
2. Crie um **Services ID** (ex.: `br.com.irisa.auth`) com Sign In with Apple habilitado, domínio `ntjirpqulrnieeglpiei.supabase.co`, return URL `https://ntjirpqulrnieeglpiei.supabase.co/auth/v1/callback`.
3. Keys → nova chave com Sign In with Apple → baixe o `.p8`, anote Key ID e Team ID.
4. Supabase → Authentication → Providers → Apple: ligue. Em "Client IDs" coloque `br.com.irisa.app` (o login nativo envia o bundle id como audience). Preencha Secret Key gerada a partir do .p8 (a tela da Supabase explica).

O app já está pronto para os dois. Sem a configuração, o botão do Google abre o navegador e volta com erro "provider is not enabled".
