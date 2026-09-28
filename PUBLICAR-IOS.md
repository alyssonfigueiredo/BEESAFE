# Publicar a Irisa no iPhone (TestFlight e App Store)

Passo a passo para o Alysson, no Mac. Os comandos são para colar no Terminal, um bloco por vez.
Tudo o que o app precisa já está na branch `claude/laughing-keller-my8t7c`.

## 1. Pegar a versão certa

```bash
cd ~/Desktop/BEESAFE
git fetch origin
git checkout claude/laughing-keller-my8t7c
git pull
npm install
```

Se a pasta tiver outro nome ou estiver em outro lugar, troque `~/Desktop/BEESAFE` pelo caminho dela.

## 2. Atualizar o banco (uma vez só)

Isto corrige o apelido que não salvava. Vale para iPhone e Android, e não depende de build.

1. Rode no Terminal. O comando copia o SQL:
   ```bash
   pbcopy < supabase/migrations/00000000000018_perfil_robusto.sql
   ```
2. Abra o Supabase, no projeto `ntjirpqulrnieeglpiei`, e vá em **SQL Editor**, depois **New query**.
3. Cole o SQL e clique em **Run**. Deve aparecer "Success. No rows returned".

## 3. Escolher o bundle id

O bundle id é o nome do app para a Apple. Hoje o código usa `br.com.irisa.ios`, porque
`br.com.irisa.app` ficou preso numa conta da Apple.

- **Se `br.com.irisa.app` está na sua conta Apple Developer**, volte para ele:
  ```bash
  sed -i '' 's/bundleIdentifier: "br.com.irisa.ios"/bundleIdentifier: "br.com.irisa.app"/' app.config.ts
  grep bundleIdentifier app.config.ts
  ```
  A última linha precisa mostrar `br.com.irisa.app`.
- **Se não está**, mantenha `br.com.irisa.ios` e não mexa em nada.

## 4. Liberar o login com Apple na Supabase

No Supabase, vá em **Authentication**, depois **Sign In / Providers**, depois **Apple**.

- O Apple precisa estar ligado.
- No campo **Client IDs**, deixe os dois nomes, separados por vírgula e sem espaço:
  ```
  br.com.irisa.ios,br.com.irisa.app
  ```
- Clique em **Save**.

Sem isso, o login com Apple dá erro. O app mostra "O login com Apple ainda não está liberado".

## 5. Gerar a build e mandar para o TestFlight

```bash
npx eas-cli login
npx eas-cli build -p ios --profile production
```

O EAS faz algumas perguntas:

- **Entrar na conta Apple:** use o Apple ID da conta Developer paga.
- **Gerar certificado e perfil de provisionamento:** responda **Yes** em tudo.
- **Ligar "Sign in with Apple" no App ID:** responda **Yes**. Sem isso, o login com Apple não abre.

A build roda na nuvem e leva de 15 a 30 minutos. Quando terminar, mande para o TestFlight:

```bash
npx eas-cli submit -p ios --latest
```

Se for o primeiro envio desse bundle, ele pede para criar o app no App Store Connect. Responda **Yes**.
Uns 10 minutos depois, a build aparece no App Store Connect, em TestFlight.

A cota de builds do plano gratuito do EAS é pequena. Só gere build nova quando mudar alguma coisa nativa.
Mudança de tela ou texto se testa com `npx expo start --dev-client`, sem build.

## 6. Testar no TestFlight antes de publicar

Confira no iPhone:

1. **Abertura:** o radar pinta o anel, as cores enchem a tela e saem, e o app aparece. Não pode aparecer
   uma logo parada antes.
2. **Barra de abas:** fica perto do rodapé. O ícone sai do cinza, passa pelo arco-íris e fica com a cor da aba.
3. **Mapa:** fica nítido. Tocar num ponto abre o balão com o nome do lugar. Mapa e Lista trocam a visão.
4. **Cadastro:** testar os três jeitos de entrar.
   - Google.
   - Apple.
   - E-mail: criar conta e depois entrar.
5. **Perfil:** trocar o apelido e salvar. Deve aparecer "Seu apelido agora é …". Depois, no Apoio,
   o apelido já deve vir preenchido.
6. **Excluir conta:** pelo Perfil, com uma conta de teste.

Se algo falhar, mande print do erro para quem está no Claude.

## 7. Enviar para a App Store

No App Store Connect, abra o app e preencha a ficha. Os textos estão em `docs/lojas.md`. Escolha a build
que veio do TestFlight e clique em **Enviar para revisão**.

A revisão da Apple deve olhar dois pontos que o app ainda não tem:

- **Bloquear outro usuário (regra 1.2):** apps com mural e avaliações precisam deixar a pessoa ocultar
  o que outra conta publica. Denúncia, moderação e excluir conta já existem.
- **Revogar o login com Apple ao excluir a conta (regra 5.1.1):** hoje a conta é apagada no nosso banco,
  mas o vínculo com a Apple não é revogado.

Se a Apple recusar por um desses pontos, a correção é no código. Nesse caso, é preciso gerar outra build.
