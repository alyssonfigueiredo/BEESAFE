# Resposta à Apple — Guideline 2.1 (Information Needed)

Isto é para colar na Apple. Duas coisas:

1. No **App Store Connect → App Review Information → Notes**, cole o bloco em inglês
   ("Review notes") inteiro. Ele fica salvo para as próximas submissões.
2. No **Resolution Center**, responda a mensagem colando o mesmo bloco e anexando o vídeo.

Antes de responder, leia a seção **Antes de responder**, no fim: a build enviada precisa ser uma que
já tenha o botão de bloquear (migrations 20 e 21, que já estão no banco).

---

## 1. Vídeo (gravar no iPhone, iOS mais novo, não no Simulador)

Grave a tela pelo iPhone (Ajustes → Central de Controle → Gravação de Tela). Um vídeo só, na ordem
abaixo, sem pressa, ~3 a 4 minutos. Não precisa narrar; se quiser, fale em inglês ou deixe sem áudio.

1. Tela de início do iPhone, tocar no ícone da Irisa (o vídeo tem que começar com o app abrindo).
2. Abertura (animação) → tela de login.
3. **Cadastro:** criar uma conta nova com e-mail e senha na frente da câmera.
4. Preencher apelido e cidade no Perfil e salvar.
5. **Início:** painel da cidade, buscar um lugar, abrir a ficha de um lugar.
6. **Conteúdo do usuário 1 — avaliar um lugar:** responder as quatro perguntas de acolhimento e enviar.
7. **Conteúdo do usuário 2 — registrar um relato:** escolher tipo, onde, quando, enviar, e mostrar o
   relato aparecendo no Mapa como área de atenção.
8. **Conteúdo do usuário 3 — mural de apoio:** escrever uma mensagem e enviar.
9. **Denunciar conteúdo:** tocar na bandeira em uma mensagem do mural, escolher o motivo, enviar, e
   mostrar o aviso de que a moderação vai revisar. Mostrar também a bandeira num relato e numa
   avaliação de lugar.
10. **Bloquear pessoa:** no mural, tocar em "Bloquear" ao lado da bandeira, confirmar, e mostrar que
    a mensagem daquela pessoa sumiu da lista. Depois abrir Perfil → **Pessoas bloqueadas** e mostrar
    o "Desbloquear".
11. **Emergência:** abrir a folha de emergência e mostrar os números (não precisa ligar).
12. **Apoio:** mostrar a lista de serviços da cidade.
13. **Sair da conta** e **entrar de novo** com a mesma conta (login).
14. **Excluir a conta:** Perfil → Excluir minha conta → confirmar, e mostrar que o app volta ao login.

Não há conteúdo pago, nem compra no app, nem assinatura — não precisa gravar nada disso.

## 2. Conta de teste

Crie uma conta só para a Apple e coloque em **App Review Information → Sign-In Required → Demo
account**:

- E-mail: `appirisa+review@gmail.com`
- Senha: uma senha simples e escrita igual nos dois lugares

O app não tem níveis de acesso para o usuário comum: uma conta basta. A tela de Moderação só aparece
para conta com papel de moderador e não é necessária para a revisão.

---

## 3. Review notes (colar em inglês)

```
IRISA — REVIEW NOTES

1) DEMO ACCOUNT
Email: appirisa+review@gmail.com
Password: <SENHA>
Sign in with Apple and Sign in with Google also work. There is only one user role; no
additional account types are needed to review the app. A "Moderation" screen exists but is
only visible to accounts with a moderator role and is not required for review.

2) PURPOSE AND TARGET AUDIENCE
Irisa is a free, non-commercial safety and community app for LGBTQIA+ people in Brazil.
Target audience: LGBTQIA+ adults and allies in Brazilian cities (launch cities: Curitiba,
Recife, João Pessoa, Joinville, Natal, São Paulo, Rio de Janeiro).

Problem it solves: in Brazil, LGBTQIA+ people have no reliable way to know whether a public
place will treat them with respect, and no low-friction way to record LGBTQIA+-phobic
incidents. Generic star ratings do not answer that question.

Value it provides:
- Places rated on four welcoming dimensions (service, affection in public, restroom use,
  clientele), aggregated into a single "welcoming" score with a badge. Minimum of 5 ratings
  before a badge is shown, Bayesian average with a 6-month half-life.
- Anonymous incident reports, shown on the map as neighborhood-level "attention areas".
  Reports are about the street, never an attribute of a business: a nearby report never
  lowers a place's score. Recent reports have their coordinates blurred (~100 m). The app
  never displays a "safe area" label, because absence of reports only means nobody reported.
- A support wall where users can post short messages of support.
- An emergency sheet with Brazilian public emergency numbers (190 police, 192 ambulance,
  100 federal human-rights hotline, 188 emotional-support hotline) and a per-city directory of public LGBTQIA+
  support services (e.g. municipal LGBTQIA+ citizenship centers).

There is no advertising, no in-app purchase, no subscription and no paid content anywhere in
the app. The project is independent and free of charge.

3) HOW TO SET UP AND REACH THE MAIN FEATURES
- Launch the app, tap "Criar conta" and register with email + password (or use Sign in with
  Apple), or sign in with the demo account above. No sample files are needed.
- In the profile tab, set a nickname and a city. Choosing a city (e.g. "Curitiba") makes the
  seeded places appear even if you are not physically in Brazil; location permission is
  optional and only used to sort places by distance.
- Home tab: city panel, search, place list, "Avaliar um lugar" (rate a place) and
  "Registrar relato" (report an incident).
- Places tab: search by name, filter by category, open a place, answer the four welcoming
  questions, submit.
- Map tab: places and attention areas; tapping a neighborhood opens its summary.
- Support tab: emergency numbers, city support services, support wall (user posts).
- Every piece of user-generated content has a flag icon to report it. Reported content is
  hidden automatically after 3 reports from different accounts, pending human review, and
  moderators can remove content and suspend the account behind it.
- Content that carries visible authorship — support wall messages and place reviews — also has
  a "Bloquear" (block) action next to the flag. Blocking hides everything that person
  publishes from the blocking user. The blocked list, with an unblock action, is in the
  Profile tab under "Pessoas bloqueadas". Incident reports are fully anonymous: no author,
  nickname or profile is ever shown or reachable, so there is no author to block there;
  reporting and human moderation cover that content.
- Profile tab: nickname and city, blocked people, sign out, and "Excluir minha conta" (delete
  account), which permanently deletes the account and its content. For accounts created with
  Sign in with Apple, deleting the account also revokes the Apple token on Apple's servers
  before the user record is removed.

4) EXTERNAL SERVICES USED
- Supabase (PostgreSQL + PostGIS, hosted in São Paulo, Brazil): authentication, database,
  row-level security, realtime, and Edge Functions (Apple token revocation on account
  deletion). All user data lives here.
- Sign in with Apple (native) and Google OAuth via Supabase (system browser, PKCE).
- MapLibre with Esri "Light Gray Canvas" raster tiles for the base map (no account needed).
- Google Places API (New): only to fetch one public photo per place, by a server-side script;
  the app just displays the resulting photo URL. No user data is sent to Google.
- Place data (name, category, coordinates, address) is imported from open databases:
  OpenStreetMap (ODbL 1.0) and Overture Maps Foundation (CDLA-Permissive 2.0). Attribution is
  in the app's terms, section 12.
- Expo / EAS for building the app.
No payment processor, no advertising SDK, no analytics SDK and no AI service are used.

5) REGIONAL DIFFERENCES
The app is built for Brazil and its content is in Brazilian Portuguese. It behaves identically
in every region and country: nothing is gated by location or IP. The only difference is data
coverage — places and support services are currently seeded for Brazilian cities, so a user
outside Brazil sees the same app with an empty nearby list until they pick a Brazilian city in
the profile. The emergency numbers shown are Brazilian public numbers.

6) REGULATED INDUSTRY / THIRD-PARTY MATERIAL
The app is not part of a regulated industry. It is not a health app and provides no medical,
legal or emergency dispatch service: the emergency screen only pre-fills the phone dialer with
Brazil's public emergency numbers, which are free public information, and the app says so. It
is not published by, and does not claim to represent, any government body, NGO or business.
Third-party material used is limited to openly licensed map data (OpenStreetMap, ODbL 1.0;
Overture Maps, CDLA-Permissive 2.0), attributed in the terms, and public place photos served
through the Google Places API under Google's terms. Place names and addresses are public
business information. Users cannot upload photos in this version: all user-generated content
is text only.

7) PRIVACY AND MODERATION SUMMARY
Incident reports are anonymous: the author is never exposed in any public view, coordinates of
recent reports are blurred, and no photos or attachments are accepted. Users can report
content, block other users, and delete their own account and content from inside the app.
Privacy policy: https://alyssonfigueiredo.github.io/BEESAFE/privacidade.html
Terms: https://alyssonfigueiredo.github.io/BEESAFE/termos.html
Child safety standards (CSAE): https://alyssonfigueiredo.github.io/BEESAFE/seguranca-infantil.html
Contact: appirisa@gmail.com
```

---

## 4. Antes de responder

A Apple pede, no vídeo, "the required content reporting **and blocking** mechanisms". Os dois já
existem no código (migration 20, no banco desde 28/09/2026):

- **Denunciar:** bandeira em relato, avaliação, lugar e mensagem; 3 denúncias de pessoas diferentes
  escondem o conteúdo até a revisão.
- **Bloquear:** botão ao lado da bandeira no mural e nas avaliações, e a lista em Perfil → Pessoas
  bloqueadas. Relato não tem botão porque é anônimo: não existe autor exibido para bloquear — isso
  está explicado nas notas em inglês, item 3, e a Apple precisa ler essa explicação.

O que falta na sua mão:

1. **Build nova de iOS com esse botão** (a versão 0.1.0 (3), que foi rejeitada, é anterior):
   ```bash
   npx eas-cli build -p ios --profile production
   ```
   Só grave o vídeo nessa build.

   (O questionário IARC é só do Google Play, não da Apple. Na App Store o bloqueio não é
   declaração: é o vídeo e as Notes. No Play Console, a resposta "Sim" para bloquear outros
   usuários só vale com a build que tem o botão publicada na faixa — versionCode 10 ou mais.)
2. Testar num iPhone físico com o iOS mais novo (a Apple revisa em aparelho real) e conferir que as
   capturas da App Store mostram o app em uso, não a abertura nem o login.

## 5. Sobre a tela "versão rejeitada"

A rejeição não apaga nada: a versão 0.1.0 continua lá, editável. O caminho é responder no Resolution
Center, subir a build nova (o número de build sobe, a versão pode seguir 0.1.0) e clicar em
**Enviar para análise** de novo. Não precisa criar outra versão nem outro app.
