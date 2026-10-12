# E-mail de agradecimento aos testadores do Android

**Versão bonita: `EMAIL-TESTADORES-APPSTORE.html`** — abre no navegador, Cmd+A, Cmd+C e cola no
corpo do Gmail. Este arquivo é só o texto, de reserva.

Mandar do Gmail da Irisa (appirisa@gmail.com), com os endereços em **Cco** (nunca em Para/Cc —
um testador não pode ver o e-mail do outro).

Para pegar a lista, no SQL Editor da Supabase:

```sql
select string_agg(email, ', ') as emails
from tester_signups
where platform = 'android' and added_at is not null;
```

---

**Assunto:** A Irisa abriu pra todo mundo — e foi com a sua ajuda 🌈

Oi!

Passando pra te contar uma coisa grande: **a Irisa está no ar pra todo mundo — na App Store e no
Google Play.** E ela só chegou lá porque você testou antes.

Cada lugar que você avaliou, cada tela que travou no seu celular, cada toque que não funcionou —
tudo isso virou conserto antes de o app encontrar o público. O mapa que qualquer pessoa abre hoje
passou primeiro pelas suas mãos. Obrigade, de verdade.

**E no Android?** Também já está aberto pra todo mundo no Google Play — e isso é mérito direto de
vocês: foi o grupo de teste que cumpriu, de ponta a ponta, o período que o Google exige antes de
liberar. O app segue normal no seu celular, e as novidades continuam chegando primeiro pra quem
está no grupo.

Enquanto isso, uma atualização nova já está a caminho da sua tela: conquistas, medalhas, a sua
evolução no app e um Início repaginado.

Agora é espalhar: qualquer pessoa do seu rolê já consegue baixar.

iPhone: https://apps.apple.com/br/app/irisa/id6816761128
Android: https://play.google.com/store/apps/details?id=br.com.irisa.app

Viu algo estranho no app? Responde este e-mail que a gente conserta.

Com cor,
Irisa
O mapa dos lugares onde a gente é bem-vinde, feito por nós.
appirisa.com.br · @appirisa
