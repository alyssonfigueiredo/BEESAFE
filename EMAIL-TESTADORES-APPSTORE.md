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

**E no Android?** Seguimos em fase de teste — é a última etapa antes de abrir pra todo mundo na
Play Store também, e ela depende de uma regra do Google: o grupo de testadores precisa se manter
ativo por um período seguido. Ou seja: **continuar com o app instalado e dar uma passada nele de
vez em quando é, literalmente, o que destrava o lançamento.** Não desinstala agora que falta pouco. 🙏

Enquanto isso, uma atualização nova já está a caminho da sua tela: conquistas, medalhas, a sua
evolução no app e um Início repaginado.

Se alguém do seu rolê usa iPhone, o link é esse:
https://apps.apple.com/br/app/irisa/id6816761128

Viu algo estranho no app? Responde este e-mail que a gente conserta.

Com cor,
Irisa
O mapa dos lugares onde a gente é bem-vinde, feito por nós.
appirisa.com.br · @appirisa
