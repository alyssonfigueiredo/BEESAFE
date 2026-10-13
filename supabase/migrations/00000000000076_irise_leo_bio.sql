-- Bio nova do Léo (13/10/2026). Só troca se ninguém editou a bio pelo painel.
update public.irise_personagens
   set bio = 'O nerd que debuga gente. Fala em rajada, explica o app com precisão cirúrgica e esquece a própria agenda. A sua, não. Acha o fix pro seu perrengue e comemora sua conquista mais alto que você.'
 where n = 11
   and bio = 'Papo reto e ombro firme. Avisa antes de você chegar num lugar furado.';
