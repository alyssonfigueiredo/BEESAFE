# E-mail de agradecimento aos testadores do Android

Mandar do Gmail da Irisa (appirisa@gmail.com), com os endereços em **Cco** (nunca em Para/Cc —
um testador não pode ver o e-mail do outro).

Para pegar a lista, no SQL Editor da Supabase:

```sql
select string_agg(email, ', ') as emails
from tester_signups
where platform = 'android' and added_at is not null;
```

---

**Assunto:** A Irisa chegou na App Store — e foi com a sua ajuda 🌈

Oi!

Passando pra te contar uma coisa grande: **a Irisa está no ar na App Store, aberta pra todo
mundo.** E ela só chegou lá porque você testou antes.

Cada lugar que você avaliou, cada tela que travou no seu celular, cada toque que não funcionou —
tudo isso virou conserto antes de o app encontrar o público. O mapa que qualquer pessoa abre hoje
no iPhone passou primeiro pelas suas mãos. Obrigade, de verdade.

**E no Android?** Graças a vocês, o teste cumpriu o período que o Google exige — o lançamento
aberto na Play Store é o próximo passo, e você vai saber em primeira mão. Até lá, o app continua
funcionando normalmente no seu celular, e as novidades chegam primeiro pra quem está no teste.

Enquanto isso, uma atualização nova já está a caminho da sua tela: conquistas, medalhas, a sua
evolução no app e um Início repaginado.

Se alguém do seu rolê usa iPhone, o link é esse:
https://apps.apple.com/br/app/irisa/id6816761128

Viu algo estranho no app? Responde este e-mail que a gente conserta.

Com cor,
Irisa
O mapa dos lugares onde a gente é bem-vinde, feito por nós.
appirisa.com.br · @appirisa
