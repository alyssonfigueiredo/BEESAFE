import re

frag = open(".claude/skills/irisa-posts/radar.svgfrag").read()
i = frag.index('<symbol id="radarmark"')
j = frag.index("</symbol>", i)
simbolo = frag[frag.index(">", i) + 1 : j]
defs = simbolo[simbolo.index("<defs>") : simbolo.index("</defs>") + 7]
sw = simbolo[simbolo.index('<g class="sw">') : simbolo.index("</g>") + 4]
corpo = simbolo.replace(defs, "").replace(sw, "")
gomos = re.findall(r"<path[^>]*/>", corpo)
assert len(gomos) == 48
resto = corpo
for g in gomos:
    resto = resto.replace(g, "", 1)

# Anel nas cores da bandeira trans: azul, rosa, branco, rosa, azul, em volta, com passagem suave.
B, R, W = (0x5B, 0xCE, 0xFA), (0xF5, 0xA9, 0xB8), (0xFF, 0xFF, 0xFF)
paradas = [B, R, W, R, B, B]


def cor_trans(k):
    f = (k + 0.5) / 48 * 5
    a = int(f) % 5
    t = f - int(f)
    t = t * t * (3 - 2 * t)
    c = [round(paradas[a][n] * (1 - t) + paradas[a + 1][n] * t) for n in range(3)]
    return "#%02x%02x%02x" % tuple(c)


gomos_trans = [re.sub(r'fill="#[0-9a-fA-F]{6}"', 'fill="%s"' % cor_trans(k), g) for k, g in enumerate(gomos)]
resto_trans = resto.replace("#49dcc0", "#5BCEFA").replace("#ff6964", "#F5A9B8")


def logo(gs, r):
    return '<svg class="logo" viewBox="0 0 100 100" aria-hidden="true">' + "".join(gs) + r + "</svg>"


def varredura(cor, ident):
    d = defs.replace('id="swm"', 'id="%s"' % ident).replace("#49dcc0", cor)
    s = sw.replace("url(#swm)", "url(#%s)" % ident).replace("#49dcc0", cor)
    return '<svg class="logo" viewBox="0 0 100 100" aria-hidden="true">' + d + s + "</svg>"


html = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Irisa · Abertura · Semana da Visibilidade Trans</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@500&family=Space+Grotesk:wght@600&display=swap">
<style>
/* Vídeo da marca para a Semana da Visibilidade Trans (14/11/2026, pedido do Leandro).
   A logo começa em tons de cinza; a primeira volta do radar traz as cores da marca e a segunda,
   emendada sem parar, troca pelas da bandeira trans. Três camadas iguais (cinza, cor, trans) empilhadas; as duas de
   cima aparecem por uma máscara cônica que abre junto com a varredura, centrada no olho.
   Relógio: window.__setT(ms). Gravar: FFMPEG=... node scripts/story-video.mjs docs/abertura-trans.html docs/Irisa-abertura-trans.mp4
   ?formato=quadrado troca para 1080 x 1080. */
*{box-sizing:border-box}
html,body{margin:0;background:#e9e9ec;overflow:hidden}
body{display:flex;align-items:center;justify-content:center;height:100vh}
.capture,.capture body{background:#F5F4F1}
#stage{position:relative;width:1080px;height:var(--h);flex:none;overflow:hidden;background:#F5F4F1;transform-origin:center;--h:1920px;--cy:820px}
.quadrado #stage{--h:1080px;--cy:450px}
.camada{position:absolute;inset:0}
.fundo{position:absolute;inset:0}
.cor .fundo,.cinza .fundo{background:
  radial-gradient(60% 34% at -6% 0%,rgba(73,220,192,.42),transparent 62%),
  radial-gradient(50% 30% at 106% 8%,rgba(255,105,100,.34),transparent 62%),
  radial-gradient(55% 32% at 104% 100%,rgba(168,137,255,.40),transparent 62%),
  radial-gradient(45% 28% at -4% 100%,rgba(255,208,102,.38),transparent 62%),#F5F4F1}
.trans .fundo{background:
  radial-gradient(60% 34% at -6% 0%,rgba(91,206,250,.55),transparent 64%),
  radial-gradient(52% 32% at 106% 8%,rgba(245,169,184,.58),transparent 64%),
  radial-gradient(56% 34% at 104% 100%,rgba(91,206,250,.48),transparent 64%),
  radial-gradient(48% 30% at -4% 100%,rgba(245,169,184,.52),transparent 64%),
  radial-gradient(420px 420px at 540px var(--cy),rgba(120,170,235,.30),rgba(240,150,180,.20) 60%,transparent 100%),#F5F4F1}
.cinza{filter:grayscale(1) contrast(.6) brightness(1.22)}
.logo{position:absolute;left:260px;top:calc(var(--cy) - 280px);width:560px;height:560px;display:block}
.marca{position:absolute;left:0;right:0;top:calc(var(--cy) + 340px);text-align:center;font:500 104px/1 Urbanist,'Helvetica Neue',Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#141829;padding-left:.2em}
.marca b{font-weight:500;color:#FFAD0F}
.trans .marca b{color:#F07FA3}
.assina{position:absolute;left:0;right:0;top:calc(var(--cy) + 490px);text-align:center;font:600 34px/1.3 'Space Grotesk','Helvetica Neue',Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#3D4560;opacity:0}
.gira{position:absolute;left:260px;top:calc(var(--cy) - 280px);width:560px;height:560px;opacity:0}
.gira .logo{left:0;top:0}
</style>
</head>
<body><div id="stage">
<div id="entra" style="position:absolute;inset:0">
  <div class="camada cinza"><div class="fundo"></div>__LOGO_COR__<div class="marca">Iris<b>a</b></div></div>
  <div class="camada cor" id="cor"><div class="fundo"></div>__LOGO_COR__<div class="marca">Iris<b>a</b></div></div>
  <div class="camada trans" id="trans"><div class="fundo"></div>__LOGO_TRANS__<div class="marca">Iris<b>a</b></div></div>
  <div class="gira" id="v1">__VARR1__</div>
  <div class="gira" id="v2">__VARR2__</div>
  <div class="assina" id="assina">Semana da Visibilidade Trans</div>
</div>
</div>
<script>
const $=(s)=>document.querySelector(s);
const Q=new URLSearchParams(location.search);
if(Q.get("formato")==="quadrado")document.documentElement.classList.add("quadrado");
const TOTAL=8200;
// A linha da varredura da logo aponta para 35 graus (a partir do topo, sentido horário).
const PONTA=35, GIRO=[900,5700];
const cy=()=>getComputedStyle($("#stage")).getPropertyValue("--cy").trim();
const suave=(p)=>p<0?0:p>1?1:p*p*(3-2*p);
const entre=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
function mascara(el,ang){
  // Abre do topo, no sentido da varredura. Antes de começar fica fechada; depois de dar a volta, some.
  const m=ang<=0?"conic-gradient(transparent 0 360deg)":ang>=360?"none":`conic-gradient(from 0deg at 540px ${cy()},#000 0 ${Math.max(0,ang-1.2)}deg,transparent ${ang}deg 360deg)`;
  el.style.webkitMaskImage=m; el.style.maskImage=m;
}
// Duas voltas seguidas, sem parar: velocidade quase constante, com saída e chegada suaves.
// Na primeira volta a varredura é a turquesa da marca; ao fechar a volta ela vira rosa e segue.
window.__setT=function(t){
  $("#entra").style.opacity=String(suave(entre(t,0,600)));
  $("#entra").style.transform=`scale(${0.94+0.06*suave(entre(t,0,900))})`;
  const p=entre(t,GIRO[0],GIRO[1]);
  const ang=720*(0.8*p+0.2*suave(p));
  const visivel=Math.min(entre(t,GIRO[0]-250,GIRO[0]+150),1-entre(t,GIRO[1]-150,GIRO[1]+300));
  const troca=entre(ang,345,375);
  for(const [id,peso] of [["#v1",1-troca],["#v2",troca]]){
    $(id).style.transform=`rotate(${ang-PONTA}deg)`;
    $(id).style.opacity=String(visivel*peso);
  }
  mascara($("#cor"),Math.min(ang,360));
  mascara($("#trans"),ang-360);
  const s=suave(entre(t,GIRO[1]+200,GIRO[1]+900));
  $("#assina").style.opacity=String(s);
  $("#assina").style.transform=`translateY(${(1-s)*18}px)`;
};
window.__TOTAL=TOTAL;
const fit=()=>{const st=$("#stage");const k=Math.min(innerWidth/1080,innerHeight/st.offsetHeight);st.style.transform="scale("+k+")"};
if(Q.has("capture")){document.documentElement.classList.add("capture");window.__setT(0)}
else{fit();addEventListener("resize",fit);const t0=performance.now();(function loop(n){window.__setT((n-t0)%(TOTAL+1200));requestAnimationFrame(loop)})(t0)}
</script>
</body></html>
"""
html = (
    html.replace("__LOGO_COR__", logo(gomos, resto))
    .replace("__LOGO_TRANS__", logo(gomos_trans, resto_trans))
    .replace("__VARR1__", varredura("#49dcc0", "swA"))
    .replace("__VARR2__", varredura("#F07FA3", "swB"))
)
open("docs/abertura-trans.html", "w").write(html)
print(len(html))
