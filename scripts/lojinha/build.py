# Gera docs/lojinha.html (versão pública) e docs/lojinha-interna.html (com produção, custos e canais).
# Roda: python3 scripts/lojinha/build.py
# Depois: node scripts/carrossel-png.mjs docs/lojinha.html && node scripts/lojinha-pdf.mjs docs/lojinha.html
import random, os
random.seed(7)
H = os.path.dirname(__file__)
radar = open(f"{H}/radar.svgfrag").read()
style = open(f"{H}/style.html").read()
anim = open(f"{H}/anim.html").read()

N = "#1E2340"; W = "#FAF9F6"; RB = "url(#rb)"

def qr(x, y, s, n=21, col=N):
    c = s / n; out = []
    for i in range(n):
        for j in range(n):
            fin = (i < 7 and j < 7) or (i < 7 and j >= n - 7) or (i >= n - 7 and j < 7)
            if fin:
                ii = i if i < 7 else i - (n - 7); jj = j if j < 7 else j - (n - 7)
                on = ii in (0, 6) or jj in (0, 6) or (2 <= ii <= 4 and 2 <= jj <= 4)
            else:
                on = random.random() < 0.45
            if on: out.append(f'<rect x="{x+j*c:.1f}" y="{y+i*c:.1f}" width="{c+0.2:.1f}" height="{c+0.2:.1f}" fill="{col}"/>')
    return "".join(out)

def r(x, y, s): return f'<use href="#radar" x="{x}" y="{y}" width="{s}" height="{s}"/>'
def wm(x, y, size, fill, ls=6): return f'<text x="{x}" y="{y}" class="swm" font-size="{size}" fill="{fill}" text-anchor="middle" letter-spacing="{ls}">IRISA</text>'
def d(x, y, size, fill, t, ls=3, anchor="middle"): return f'<text x="{x}" y="{y}" class="sdisp" font-size="{size}" fill="{fill}" text-anchor="{anchor}" letter-spacing="{ls}">{t}</text>'
def lines(x, y, size, fill, ts, ls=3, lh=None):
    lh = lh or size * 1.12
    return "".join(d(x, y + i * lh, size, fill, t, ls) for i, t in enumerate(ts))
def rule(x, y, w, h=10): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{RB}"/>'
def lab(x, y, t, anchor="middle", size=26): return f'<text x="{x}" y="{y}" class="slab" font-size="{size}" text-anchor="{anchor}">{t}</text>'

FAB = {"night": ("url(#fNight)", "#0F1226", "rgba(255,255,255,.10)"), "cru": ("url(#fCru)", "#C9BEA6", "rgba(0,0,0,.08)"), "white": ("url(#fWhite)", "#D6D0C4", "rgba(0,0,0,.07)")}
def wr(paths, col): return "".join(f'<path d="{p}" fill="none" stroke="{col}" stroke-width="3" stroke-linecap="round"/>' for p in paths)

# ---------- peças (todas em caixa 400 de largura; área útil de estampa ≈ 230 px centrada em x=200) ----------
def tee(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M118 36 C140 62 168 76 200 76 C232 76 260 62 282 36 L352 72 L394 178 L318 204 L318 430 L82 430 L82 204 L6 178 L48 72 Z" fill="{f}" stroke="{st}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M118 36 C140 62 168 76 200 76 C232 76 260 62 282 36 C272 30 262 26 252 23 C238 48 220 58 200 58 C180 58 162 48 148 23 C138 26 128 30 118 36 Z" fill="{st}" opacity=".55"/>
<path d="M82 204 C84 150 92 100 118 36 M318 204 C316 150 308 100 282 36" fill="none" stroke="{st}" stroke-width="2" opacity=".7"/>
{wr(["M120 300 C150 290 170 310 200 300","M230 370 C250 360 280 380 300 372"],w)}
<path d="M82 430 L318 430" stroke="{st}" stroke-width="5"/>
{inner}</g>'''
def hoodie(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M126 74 L40 118 L4 236 L84 262 L84 480 L316 480 L316 262 L396 236 L360 118 L274 74 Z" fill="{f}" stroke="{st}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M126 74 C110 20 290 20 274 74 C262 120 240 132 200 132 C160 132 138 120 126 74 Z" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<path d="M150 60 C160 100 180 118 200 118 C220 118 240 100 250 60" fill="none" stroke="{st}" stroke-width="2.5"/>
<path d="M186 120 C182 160 180 200 178 240 M214 120 C218 160 220 200 222 240" stroke="url(#rbv)" stroke-width="4" stroke-linecap="round" fill="none"/>
<path d="M104 380 L296 380 L296 462 L104 462 Z" fill="none" stroke="{st}" stroke-width="2.5"/>
<path d="M84 262 C86 200 96 150 126 74 M316 262 C314 200 304 150 274 74" fill="none" stroke="{st}" stroke-width="2" opacity=".7"/>
<path d="M84 480 L316 480" stroke="{st}" stroke-width="8"/>
{wr(["M120 330 C150 320 170 340 200 330"],w)}
{inner}</g>'''
def tote(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M112 176 C112 30 186 30 186 176" fill="none" stroke="{st}" stroke-width="18" stroke-linecap="round"/>
<path d="M214 176 C214 30 288 30 288 176" fill="none" stroke="{st}" stroke-width="18" stroke-linecap="round"/>
<path d="M112 176 C112 30 186 30 186 176 M214 176 C214 30 288 30 288 176" fill="none" stroke="{f}" stroke-width="10" stroke-linecap="round"/>
<path d="M62 156 L338 156 L348 480 L52 480 Z" fill="{f}" stroke="{st}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M62 156 L338 156 L336 178 L64 178 Z" fill="{st}" opacity=".35"/>
{wr(["M80 300 C120 292 160 310 200 300","M200 400 C240 392 290 410 330 400"],w)}
{inner}</g>'''
def cap(x, y, kind, inner, scale=1):
    f, st = ("url(#fNight)", "#0F1226") if kind == "night" else ("url(#fCru)", "#C9BEA6")
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M60 236 C60 150 90 70 210 62 C330 56 356 150 356 236 C300 250 120 250 60 236 Z" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<path d="M210 62 C186 120 176 180 174 244 M130 82 C112 140 104 190 102 240 M290 78 C300 140 302 190 300 240" fill="none" stroke="{st}" stroke-width="2" opacity=".85"/>
<circle cx="210" cy="60" r="9" fill="{st}"/>
<circle cx="150" cy="140" r="4" fill="none" stroke="{st}" stroke-width="2"/><circle cx="236" cy="136" r="4" fill="none" stroke="{st}" stroke-width="2"/>
<path d="M60 236 C120 250 300 250 356 236 C356 250 300 262 210 262 C120 262 60 250 60 236 Z" fill="{st}" opacity=".55"/>
<path d="M22 262 C40 226 110 218 176 236 C200 244 214 254 214 264 C190 296 100 306 30 292 Z" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<path d="M22 262 C40 226 110 218 176 236 C120 226 60 236 22 262 Z" fill="{st}" opacity=".4"/>
{inner}</g>'''
def bucket(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M110 90 C110 40 290 40 290 90 L310 230 L90 230 Z" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<path d="M90 230 L310 230 C380 236 390 296 340 300 C280 306 120 306 60 300 C10 296 20 236 90 230 Z" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<path d="M100 150 L300 150 M96 190 L304 190" stroke="{st}" stroke-width="1.5" opacity=".6"/>
<path d="M110 90 C110 110 290 110 290 90" fill="none" stroke="{st}" stroke-width="2" opacity=".6"/>
{inner}</g>'''
def mug(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M296 150 C384 150 384 320 296 320" fill="none" stroke="{st}" stroke-width="34" stroke-linecap="round"/>
<path d="M296 150 C384 150 384 320 296 320" fill="none" stroke="{f}" stroke-width="20" stroke-linecap="round"/>
<rect x="80" y="76" width="226" height="320" rx="24" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<rect x="96" y="96" width="30" height="270" rx="15" fill="#fff" opacity=".18"/>
<ellipse cx="193" cy="78" rx="113" ry="16" fill="{st}"/>
<ellipse cx="193" cy="78" rx="100" ry="10" fill="{f}" opacity=".9"/>
{inner}</g>'''
def bottle(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<rect x="150" y="20" width="100" height="74" rx="14" fill="{st}"/>
<rect x="150" y="60" width="100" height="10" fill="#000" opacity=".2"/>
<rect x="118" y="86" width="164" height="400" rx="50" fill="{f}" stroke="{st}" stroke-width="2.5"/>
<rect x="134" y="110" width="22" height="330" rx="11" fill="#fff" opacity=".14"/>
{inner}</g>'''
def phone(x, y, kind, inner, scale=1):
    f, st, w = FAB[kind]
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<rect x="90" y="20" width="220" height="450" rx="40" fill="{f}" stroke="{st}" stroke-width="3"/>
<rect x="104" y="34" width="192" height="422" rx="30" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
<rect x="110" y="40" width="88" height="88" rx="22" fill="{st}"/>
<circle cx="134" cy="64" r="13" fill="#0a0d1a"/><circle cx="174" cy="64" r="13" fill="#0a0d1a"/><circle cx="134" cy="104" r="13" fill="#0a0d1a"/><circle cx="176" cy="104" r="6" fill="#222"/>
<circle cx="134" cy="64" r="4" fill="#3b4a7a"/><circle cx="174" cy="64" r="4" fill="#3b4a7a"/><circle cx="134" cy="104" r="4" fill="#3b4a7a"/>
{inner}</g>'''
def sticker(x, y, w, h, rx, fill, inner):
    return f'<g transform="translate({x} {y})" filter="url(#sh2)"><rect x="0" y="0" width="{w}" height="{h}" rx="{rx}" fill="#fff"/><rect x="10" y="10" width="{w-20}" height="{h-20}" rx="{max(rx-8,4)}" fill="{fill}"/>{inner}</g>'
def pin(x, y, inner, fill=N):
    return f'<g transform="translate({x} {y})" filter="url(#sh)"><circle cx="120" cy="120" r="120" fill="#fff"/><circle cx="120" cy="120" r="110" fill="{fill}"/><circle cx="120" cy="120" r="110" fill="url(#gloss)"/>{inner}</g>'
def fan(x, y, inner, scale=1):
    # leque aberto: 12 varetas em arco-íris
    cols = ["#F4736F","#F58A66","#F5A45D","#F2B769","#F0CA75","#A6C995","#5CC9B4","#61BFC6","#6AA8EE","#8C9FF0","#AE96F2","#C48BC9"]
    segs = []
    import math
    for i, c in enumerate(cols):
        a0 = math.radians(200 + i * 140 / 12); a1 = math.radians(200 + (i + 1) * 140 / 12)
        R = 330; ri = 70
        segs.append(f'<path d="M{200+ri*math.cos(a0):.1f} {360+ri*math.sin(a0):.1f} L{200+R*math.cos(a0):.1f} {360+R*math.sin(a0):.1f} A{R} {R} 0 0 1 {200+R*math.cos(a1):.1f} {360+R*math.sin(a1):.1f} L{200+ri*math.cos(a1):.1f} {360+ri*math.sin(a1):.1f} Z" fill="{c}" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>')
    return f'<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">{"".join(segs)}<circle cx="200" cy="360" r="14" fill="{N}"/><circle cx="200" cy="360" r="5" fill="#fff"/>{inner}</g>'
def pen(x, y, fill, inner, scale=1):
    return f'''<g transform="translate({x} {y}) scale({scale}) rotate(-30 200 200)" filter="url(#sh)">
<rect x="180" y="20" width="40" height="330" rx="12" fill="{fill}" stroke="#0F1226" stroke-width="1.5"/>
<rect x="182" y="22" width="10" height="326" rx="5" fill="#fff" opacity=".18"/>
<path d="M180 350 L200 400 L220 350 Z" fill="#C9C2B4"/><path d="M196 390 L200 404 L204 390 Z" fill="{N}"/>
<rect x="176" y="30" width="48" height="14" rx="4" fill="#C9C2B4"/><rect x="212" y="40" width="10" height="90" rx="5" fill="#C9C2B4"/>
{inner}</g>'''
def whistle(x, y, inner, scale=1):
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<circle cx="120" cy="52" r="26" fill="none" stroke="#C9C2B4" stroke-width="9"/>
<path d="M120 78 L124 110" stroke="#C9C2B4" stroke-width="9" stroke-linecap="round"/>
<path d="M150 130 L360 130 C376 130 380 140 380 150 L380 178 C380 188 376 196 360 196 L150 196 Z" fill="{N}" stroke="#0F1226" stroke-width="2"/>
<circle cx="130" cy="180" r="70" fill="{N}" stroke="#0F1226" stroke-width="2"/>
<circle cx="130" cy="180" r="70" fill="url(#gloss)"/>
<rect x="250" y="146" width="90" height="12" rx="6" fill="#0F1226"/>
<ellipse cx="205" cy="138" rx="24" ry="8" fill="#0F1226"/>
{inner}</g>'''
def cup(x, y, inner, scale=1):
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<path d="M110 60 L290 60 L270 420 L130 420 Z" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.55)" stroke-width="3"/>
<ellipse cx="200" cy="60" rx="90" ry="14" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.6)" stroke-width="3"/>
<path d="M130 80 C128 200 126 300 128 400" stroke="#fff" stroke-opacity=".35" stroke-width="10" stroke-linecap="round"/>
{inner}</g>'''
def bracelet(x, y, inner, scale=1):
    return f'''<g transform="translate({x} {y}) scale({scale})" filter="url(#sh)">
<ellipse cx="200" cy="200" rx="170" ry="120" fill="none" stroke="url(#rb)" stroke-width="42"/>
<ellipse cx="200" cy="200" rx="170" ry="120" fill="none" stroke="url(#braid2)" stroke-width="42"/>
<ellipse cx="200" cy="200" rx="170" ry="120" fill="none" stroke="#1E2340" stroke-opacity=".3" stroke-width="1.5"/>
{inner}</g>'''
def magnet(x, y, w, h, fill, inner):
    return f'<g transform="translate({x} {y})" filter="url(#sh)"><rect x="0" y="0" width="{w}" height="{h}" rx="14" fill="{fill}"/><rect x="6" y="6" width="{w-12}" height="{h-12}" rx="10" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>{inner}</g>'
def card(x, y, inner, rot=0):
    return f'<g transform="translate({x} {y}) rotate({rot})" filter="url(#sh)"><rect x="0" y="0" width="300" height="180" rx="16" fill="#fff"/>{rule(0,0,300,10)}{inner}</g>'

# ---------- lâminas ----------
def slide(t, sub, dark, svg, cap_): return dict(t=t, sub=sub, dark=dark, svg=svg, cap=cap_)

PUB = []
PUB.append(slide("Lojinha", "Irisa", True, f'''<svg viewBox="0 0 960 900">
<circle cx="480" cy="330" r="260" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.1)" stroke-width="2"/>
{r(270,120,420)}
{lines(480,700,64,'#fff',['QUANTA COR','TEM ESSE LUGAR?'],6,72)}
</svg>''', "Camiseta · Oversized · Moletom · Ecobag · Boné · Bucket · Capinha · Leque · Caneta · Cartão de mesa · Apito · Copo · Pulseira · Ímã · Adesivos · Bottons · Caneca · Garrafa · Chaveiro · Cordão · Placa"))

# frases: 3 lâminas
def frases(title, sub, items, dark, cap_):
    ys = 0; out = []; y = 70
    big = items[0]
    out.append("".join(d(40, 90 + i * 66, 64, "#fff" if dark else N, t, 2, "start") for i, t in enumerate(big)))
    y = 90 + 66 * len(big) + 40
    col = "#D5D8E4" if dark else "#4F576F"
    for t in items[1:]:
        out.append(d(40, y, 40, col, t, 2, "start")); y += 62
    out.append(rule(40, y - 20, 300, 12))
    return slide(title, sub, dark, f'<svg viewBox="0 0 960 900"><g class="stagger">{"".join(out)}</g></svg>', cap_)

PUB.append(frases("Frases da marca", "As palavras que vão nas peças", [
    ["QUANTA COR", "TEM ESSE LUGAR?"],
    "BEM-VINDE AQUI.", "O LUGAR RECEBE COR. A RUA RECEBE AVISO.", "ESTRELAS NÃO DIZEM NADA PRA GENTE.",
    "QUEM ESTEVE LÁ RESPONDE.", "SEM NOME. SEM PERFIL. SEM RASTRO.", "IRISE VOCÊ TAMBÉM.",
    "JÁ IRISEI ESSE LUGAR.", "COR É MEDIDA.", "FEITO POR NÓS."], False,
    "Nenhuma peça diz \"seguro\". A marca mede acolhimento, não promete segurança."))
PUB.append(frases("Frases da cena", "Pajubá e clássicos da comunidade, adaptados", [
    ["FORA DO ARMÁRIO.", "DENTRO DO MAPA."],
    "AQUENDA ESSE LUGAR.", "MONA, AVALIA.", "CHEGA DANDO CLOSE. E IRISA.",
    "ESTAMOS AQUI. E NO MAPA.", "NÓS POR NÓS, NO MAPA.", "NÃO É FASE. É ENDEREÇO.",
    "LACROU? IRISA.", "PURPURINA É POUCO. QUERO NOTA.", "TODO MUNDO JÁ FOI BICHA NOVA."], True,
    "\"Estamos aqui\" vem do grito clássico we're here, we're queer. Pajubá é a língua da nossa rua."))
PUB.append(frases("Frases da rua", "Segurança, política e afeto", [
    ["BANDEIRA NA PORTA", "NÃO BASTA."],
    "NÃO É BANDEIRA NA PORTA. É GENTE NA MESA.", "A RUA TAMBÉM É NOSSA.", "BEIJAR É POLÍTICO.",
    "NINGUÉM SOLTA A MÃO DE NINGUÉM.", "A GENTE CUIDA DA GENTE.", "SILÊNCIO NÃO É NOTA.",
    "ORGULHO É SAIR DE CASA.", "TODES QUER DIZER TODES.", "ARCO-ÍRIS DE VERDADE TEM NOTA."], False,
    "\"Ninguém solta a mão de ninguém\" é de 2018 e continua. \"Silêncio não é nota\" é a regra do app: sem relato não significa área tranquila."))

# estampas: 6 mini camisetas com frases
mini = [
    ("night", lines(200,190,30,'#fff',['FORA DO','ARMÁRIO.','DENTRO','DO MAPA.'],3,36)),
    ("cru", lines(200,210,34,N,['MONA,','AVALIA.'],3,40)+rule(140,262,120,8)),
    ("white", lines(200,200,26,N,['BANDEIRA','NA PORTA','NÃO BASTA.'],3,32)+r(170,300,60)),
    ("night", lines(200,200,26,'#fff',['A RUA','TAMBÉM','É NOSSA.'],3,32)+rule(140,300,120,8)),
    ("cru", lines(200,200,26,N,['NÃO É FASE.','É ENDEREÇO.'],3,32)+r(170,260,60)),
    ("night", lines(200,205,30,'#F0CA75',['LACROU?'],3)+lines(200,250,40,'#fff',['IRISA.'],4)),
]
g = ""
for i, (k, inner) in enumerate(mini):
    g += tee(40 + (i % 3) * 300, 20 + (i // 3) * 430, k, inner, .7)
PUB.append(slide("Estampas", "As frases nas peças", True, f'<svg viewBox="0 0 960 900">{g}</svg>', "Qualquer frase entra em qualquer peça. Estas são as seis que mais pedem camiseta."))

PUB.append(slide("Camiseta", "Símbolo no peito. Pergunta nas costas.", False, f'''<svg viewBox="0 0 960 900">
{tee(40,60,'night', r(150,120,52)+wm(176,215,22,'#fff',5))}
{tee(520,60,'night', rule(100,150,200,10)+lines(200,215,32,'#fff',['QUANTA COR','TEM ESSE','LUGAR?'],3,40)+wm(200,360,16,'#F0CA75',6))}
{lab(240,560,'Frente')}{lab(720,560,'Costas')}
{tee(40,600,'white', r(150,120,52)+wm(176,215,22,N,5),.62)}
{tee(300,600,'cru', rule(100,150,200,10)+lines(200,215,32,N,['QUANTA COR','TEM ESSE','LUGAR?'],3,40),.62)}
{lab(700,700,'Algodão 100%',size=28)}{lab(700,740,'Preta, off-white, cru',size=28)}{lab(700,780,'P ao GG',size=28)}
</svg>''', "A peça de entrada. Quem usa vira a pergunta andando pela cidade."))

PUB.append(slide("Oversized", "Estampa grande nas costas.", True, f'''<svg viewBox="0 0 960 900">
{tee(40,40,'cru', lines(200,180,28,N,['ESTRELAS NÃO','DIZEM NADA','PRA GENTE.'],2,32)+rule(120,290,160,8)+r(150,310,100)+lines(200,430,16,'#4F576F',['QUEM ESTEVE LÁ RESPONDE.'],2),1.05)}
{tee(500,40,'night', lines(200,160,54,'#fff',['BEM-','VINDE','AQUI.'],3,56)+rule(110,300,180,10)+lines(200,350,17,'#8A90A2',['O MAPA DOS LUGARES','ONDE A GENTE','É BEM-VINDE.','FEITO POR NÓS.'],2,22),1.05)}
{lab(250,560,'Costas · cru')}{lab(710,560,'Costas · preta')}
<g transform="translate(180 620)"><rect x="0" y="0" width="600" height="170" rx="26" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
{lab(300,66,'Corte boxy, ombro caído, malha pesada',size=28)}{lab(300,112,'Frente só com o símbolo pequeno no peito',size=26)}</g>
</svg>''', "O corte mais pedido hoje. Frente limpa, costas com a frase inteira."))

PUB.append(slide("Moletom", "Para a noite que esfria na fila da balada.", False, f'''<svg viewBox="0 0 960 900">
{hoodie(40,60,'night', rule(100,240,200,10)+lines(200,300,30,'#fff',['QUANTA COR','TEM ESSE','LUGAR?'],3,36))}
{hoodie(500,60,'cru', r(150,200,100)+wm(200,345,24,N,7))}
<g transform="translate(80 640)"><rect x="0" y="0" width="800" height="150" rx="26" fill="{N}"/>
{r(30,40,70)}<text x="120" y="66" class="slab" style="fill:#fff" font-size="28">Canguru com capuz, unissex, P ao GG.</text><text x="120" y="108" class="slab" style="fill:#8A90A2" font-size="24">Cordão do capuz em arco-íris.</text></g>
</svg>''', "Preto com a pergunta ou cru com o símbolo. A peça de inverno da marca."))

PUB.append(slide("Ecobag", "A sacola que responde antes de você perguntar.", False, f'''<svg viewBox="0 0 960 900">
{tote(30,60,'cru', r(150,200,100)+d(200,370,52,N,'BEM-VINDE',3)+rule(120,392,160,10))}
{tote(530,60,'night', rule(90,220,220,12)+lines(200,310,40,'#fff',['QUANTA COR','TEM ESSE','LUGAR?'],3,46)+wm(200,460,20,'#F0CA75',7))}
{tote(280,560,'white', lines(200,300,30,N,['JÁ IRISEI','ESSE LUGAR.'],3,38)+r(170,360,60),.62)}
{lab(200,760,'Algodão cru')}{lab(760,760,'Preta')}
</svg>''', "40 × 45 cm, alça longa. Vai na feira, na praia e na parada."))

PUB.append(slide("Boné e bucket", "Bordado. Sem estampa que descasca.", False, f'''<svg viewBox="0 0 960 900">
{cap(20,60,'night', r(184,150,60))}
{cap(540,60,'cru', wm(214,200,28,N,7)+rule(168,212,92,8))}
{bucket(60,460,'night', wm(200,180,26,'#F0CA75',8))}
{bucket(540,460,'cru', r(170,120,60))}
{lab(220,420,'Boné aba curva')}{lab(740,420,'Boné aba curva')}
{lab(240,800,'Bucket hat')}{lab(740,800,'Bucket hat')}
</svg>''', "Símbolo ou nome bordado. Ajuste traseiro no boné; bucket em tamanho único."))

PUB.append(slide("Capinha", "O símbolo na mão o dia inteiro.", True, f'''<svg viewBox="0 0 960 900">
{phone(20,40,'night', r(150,200,100)+wm(200,345,20,'#F0CA75',7))}
{phone(300,40,'white', rule(130,180,140,10)+lines(200,250,26,N,['QUANTA COR','TEM ESSE','LUGAR?'],2,32))}
{phone(580,40,'cru', lines(200,220,40,N,['BEM-','VINDE','AQUI.'],3,44)+rule(150,340,100,8))}
{lab(480,600,'Para os modelos mais vendidos de iPhone e Android')}
{lab(480,650,'Silicone fosco ou rígida brilhante',size=24)}
</svg>''', "Item barato, alta rotação e o que mais aparece em foto."))

PUB.append(slide("Leque", "O clássico da cena, aberto e fazendo barulho.", True, f'''<svg viewBox="0 0 960 900">
{fan(80,40, lines(200,250,26,N,['QUANTA COR','TEM ESSE LUGAR?'],2,32))}
{fan(560,180, d(200,258,40,N,'AQUENDA',4)+d(200,296,22,N,'ESSE LUGAR.',3),.7)}
{lab(280,800,'Leque de tecido, 23 cm')}{lab(700,800,'Versão de bolso')}
</svg>''', "Leque abre, estala e faz a pergunta. É o item que mais circula em parada e em pista."))

PUB.append(slide("Caneta e cartão de mesa", "Para deixar no bar antes de ir embora.", False, f'''<svg viewBox="0 0 960 900">
{pen(0,40,N, wm(200,140,16,'#F0CA75',5)+'<text transform="rotate(90 200 200)" x="200" y="120" class="sdisp" font-size="14" fill="#fff" text-anchor="middle" letter-spacing="2">QUANTA COR TEM ESSE LUGAR?</text>')}
{pen(120,40,'#5CC9B4', '<text transform="rotate(90 200 200)" x="200" y="120" class="sdisp" font-size="14" fill="#1E2340" text-anchor="middle" letter-spacing="2">BEM-VINDE AQUI.</text>')}
{card(420,160, r(20,40,90)+lines(200,70,22,N,['ESSE LUGAR','MERECE COR?'],2,26)+d(200,130,16,'#4F576F','AVALIE NO IRISA',3)+d(200,156,14,'#8A90A2','BIT.LY/APPIRISA',3),-6)}
{card(460,400, rule(0,0,300,10)+lines(150,70,22,N,['OBRIGADE PELO','ACOLHIMENTO.'],2,26)+d(150,120,16,'#4F576F','ESSE LUGAR JÁ TEM COR',2)+r(120,130,40),4)}
{lab(700,690,'Cartão de mesa, pack com 50',size=26)}{lab(200,690,'Caneta e marcador',size=26)}
</svg>''', "O cartão fica na mesa com a conta: o lugar descobre que foi avaliado e quem trabalha lá descobre o app."))

PUB.append(slide("Apito e pulseira", "O símbolo perto de quem precisa dele.", True, f'''<svg viewBox="0 0 960 900">
{whistle(20,120, r(95,145,70)+wm(300,178,16,'#F0CA75',5),1.1)}
{bracelet(520,60, wm(200,215,42,N,10))}
{lab(260,520,'Apito chaveiro, 110 dB')}{lab(720,520,'Pulseira de silicone')}
<g transform="translate(130 600)"><rect x="0" y="0" width="700" height="170" rx="26" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
{lab(350,64,'O app tem botão de emergência (190, 192, 100, 188).',size=27)}{lab(350,112,'O apito é a versão que não precisa de bateria.',size=27)}</g>
</svg>''', "Segurança faz parte da proposta. Um apito no chaveiro e uma pulseira que diz de onde você é."))

PUB.append(slide("Copo e ímã", "Da pista para a geladeira.", True, f'''<svg viewBox="0 0 960 900">
{cup(40,40, rule(130,150,140,10)+lines(200,220,28,'#fff',['QUANTA COR','TEM ESSA','BALADA?'],3,34)+r(170,330,60),1.1)}
{magnet(540,120,340,220,N, r(30,60,100)+lines(230,110,34,'#fff',['BEM-VINDE','AQUI.'],2,40))}
{magnet(560,400,300,200,W, lines(150,80,30,N,['JÁ IRISEI','ESSE LUGAR.'],2,36)+rule(90,120,120,8)+d(150,168,16,'#8A90A2','BIT.LY/APPIRISA',3))}
{lab(260,580,'Copo long drink, reutilizável')}{lab(710,680,'Ímã de geladeira e de balcão')}
</svg>''', "O copo é o brinde de festa; o ímã vai para o balcão do bar que topa ser avaliado."))

PUB.append(slide("Adesivos", "Para o notebook, a garrafa e a porta do bar.", False, f'''<svg viewBox="0 0 960 900">
<g transform="translate(60 40)"><rect x="0" y="0" width="840" height="800" rx="28" fill="#fff" stroke="#D9D3C8" stroke-width="3" filter="url(#sh)"/>
<g transform="translate(60 60)">
<g filter="url(#sh2)"><circle cx="140" cy="140" r="140" fill="#fff"/><circle cx="140" cy="140" r="128" fill="{N}"/>{r(40,40,200)}</g>
{sticker(340,0,380,280,40,N, rule(60,70,260,12)+d(190,175,64,'#fff','BEM-VINDE',3)+d(190,225,22,'#8A90A2','AQUI.',8))}
{sticker(0,340,380,340,40,W, r(60,50,90)+lines(250,95,32,N,['ESSE LUGAR','ESTÁ NO MAPA'],2,38)+lines(190,215,26,'#4F576F',['QUANTA COR TEM','ESSE LUGAR? AVALIE.'],2,34)+d(190,300,20,'#8A90A2','BIT.LY/APPIRISA',3))}
<g transform="translate(400 340)" filter="url(#sh2)"><rect x="0" y="0" width="320" height="320" rx="160" fill="#fff"/><rect x="10" y="10" width="300" height="300" rx="150" fill="{N}"/>
<circle cx="160" cy="160" r="118" fill="none" stroke="{RB}" stroke-width="22"/>
{d(160,150,64,'#fff','IRISE',4)}{d(160,196,26,'#F0CA75','VOCÊ TAMBÉM',5)}</g>
</g></g>
</svg>''', "Vinil resistente à água, pack com 4. O da porta é para o lugar que quer ser avaliado."))

PUB.append(slide("Bottons", "Pequenos. Dizem tudo.", True, f'''<svg viewBox="0 0 960 900">
{pin(60,60, r(40,40,160))}
{pin(360,60, lines(120,112,38,'#fff',['BEM','VINDE'],4,46)+rule(50,176,140,8))}
{pin(660,60, f'<circle cx="120" cy="120" r="86" fill="none" stroke="{RB}" stroke-width="16"/>'+d(120,138,52,N,'COR',3), W)}
{pin(210,380, wm(120,136,42,'#F0CA75',8))}
{pin(510,380, r(80,36,80)+lines(120,150,24,'#fff',['O LUGAR','RECEBE'],2,28)+d(120,208,26,'#F4736F','COR',4))}
{lab(480,740,'Botton 55 mm · pack com 5')}
</svg>''', "Para a jaqueta, a mochila e o cordão. O item de menor custo e maior alcance."))

PUB.append(slide("Caneca e garrafa", "Cor no café da manhã.", False, f'''<svg viewBox="0 0 960 900">
{mug(10,120,'white', r(150,160,80)+lines(190,290,22,N,['QUANTA COR TEM','ESSE LUGAR?'],1,28))}
{mug(510,120,'night', rule(120,170,140,10)+lines(190,260,50,'#fff',['BEM-','VINDE'],2,58))}
{bottle(290,380,'night', r(160,170,80)+wm(200,320,18,'#F0CA75',7)+rule(150,340,100,8))}
{lab(190,600,'Caneca branca · 325 ml')}{lab(760,600,'Caneca preta · 325 ml')}{lab(760,760,'Garrafa térmica')}{lab(760,796,'500 ml, símbolo gravado')}
</svg>''', "A caneca é o item mais vendido de qualquer lojinha. Aqui ela faz a pergunta."))

PUB.append(slide("Chaveiro e cordão", "O símbolo perto da chave de casa.", True, f'''<svg viewBox="0 0 960 900">
<g transform="translate(80 100)" filter="url(#sh)">
<circle cx="150" cy="40" r="34" fill="none" stroke="#C9C2B4" stroke-width="10"/>
<rect x="100" y="70" width="100" height="30" rx="8" fill="#C9C2B4"/>
<rect x="50" y="100" width="200" height="240" rx="30" fill="{N}"/>
<rect x="60" y="110" width="180" height="220" rx="24" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="2"/>
{r(90,130,120)}{wm(150,300,22,'#F0CA75',7)}
</g>
{lab(230,480,'Chaveiro acrílico')}
<g transform="translate(400 40)">
<path d="M120 0 C60 200 60 400 190 560 C320 400 320 200 260 0" fill="none" stroke="url(#rbv)" stroke-width="44" stroke-linecap="round" filter="url(#sh)"/>
<path d="M120 0 C60 200 60 400 190 560 C320 400 320 200 260 0" fill="none" stroke="url(#braid)" stroke-width="44" stroke-linecap="round"/>
<path d="M120 0 C60 200 60 400 190 560 C320 400 320 200 260 0" fill="none" stroke="url(#braid2)" stroke-width="44" stroke-linecap="round"/>
<circle cx="190" cy="575" r="22" fill="#C9C2B4"/>
<g filter="url(#sh)"><rect x="100" y="600" width="180" height="130" rx="18" fill="#fff"/>{r(120,620,50)}<text x="180" y="655" class="slab" style="fill:{N}" font-size="22">Irisa</text>{rule(180,672,80,8)}<rect x="120" y="695" width="140" height="6" rx="3" fill="#E4DED5"/></g>
{lab(190,800,'Cordão trançado para crachá')}
</g>
</svg>''', "Chaveiro em acrílico. Cordão para eventos, paradas e o crachá do trabalho."))

PUB.append(slide("Placa de vitrine", "Para o lugar que topa ser avaliado.", False, f'''<svg viewBox="0 0 960 900">
<g transform="translate(180 20)" filter="url(#sh)">
<rect x="0" y="0" width="600" height="850" rx="20" fill="#fff"/>
{rule(0,0,600,18)}
{r(240,60,120)}
{lines(300,250,58,N,['ESSE LUGAR','ESTÁ NO MAPA'],3,62)}
<text x="300" y="372" class="slab" text-anchor="middle" font-size="28" style="fill:#4F576F">Quanta cor tem esse lugar?</text>
<text x="300" y="408" class="slab" text-anchor="middle" font-size="28" style="fill:#4F576F">Quem esteve aqui responde.</text>
<text x="300" y="444" class="slab" text-anchor="middle" font-size="28" style="fill:#4F576F">Avalie no Irisa.</text>
<rect x="180" y="480" width="240" height="240" rx="16" fill="{W}"/>
{qr(196,496,208)}
{d(300,775,30,N,'BIT.LY/APPIRISA',4)}
{rule(0,832,600,18)}
</g>
</svg>''', "Placa A5 para o balcão ou a porta, com QR para a ficha do lugar. Quem esteve lá responde às quatro perguntas."))

# ---------- lâminas só da versão interna ----------
def how(title, cards, cap_="", dense=False):
    body = "".join(f"<div><b>{a}</b><p>{b}</p></div>" for a, b in cards)
    return dict(t=title, sub="", dark=True, how=body, cap=cap_, dense=dense)

INT = [
    how("Como produzir", [
        ("Sob demanda, sem estoque", "Camiseta, oversized, moletom, ecobag, boné, capinha e caneca em estampa sob demanda (Montink, Lolja, Camiseteria). Sobe a arte, o site vende, eles produzem e enviam."),
        ("Gráfica e brindes", "Adesivos, bottons, ímãs, cartões de mesa, leques, canetas, apitos, pulseiras, chaveiros, cordões e a placa saem de gráfica rápida ou fornecedor de brindes, tiragem de 50 a 200."),
        ("Arte pronta", "Símbolo, nome e frases em vetor (SVG), sem perda em nenhum tamanho. Fundos: preto, off-white e cru."),
        ("Para onde vai", "Cada venda paga servidor, cota de fotos e a próxima cidade no mapa."),
    ]),
    how("Custo e preço", [
        ("Camiseta", "custo R$ 45–60 · venda R$ 89–119"),
        ("Oversized", "custo R$ 60–75 · venda R$ 129–149"),
        ("Moletom", "custo R$ 110–140 · venda R$ 199–249"),
        ("Ecobag", "custo R$ 18–25 · venda R$ 49–59"),
        ("Boné bordado", "custo R$ 35–45 · venda R$ 79–89"),
        ("Caneca", "custo R$ 25–30 · venda R$ 59–69"),
        ("Capinha", "custo R$ 30–40 · venda R$ 79–89"),
        ("Leque", "custo R$ 8–15 · venda R$ 35–45"),
        ("Adesivos (4) / Bottons (5)", "custo R$ 5–12 · venda R$ 15–30"),
        ("Cartão de mesa (50) / ímã / apito", "custo R$ 3–12 · venda R$ 15–29 ou brinde"),
    ], "Estimativa de 2026 para sob demanda e brinde em tiragem pequena. Conferir na plataforma antes de publicar preço.", dense=True),
    how("Canais e primeiros passos", [
        ("1. Loja sob demanda", "Criar a loja na Montink com 4 peças (camiseta, oversized, ecobag, caneca). Link na bio do @irisapp ao lado do app."),
        ("2. Kit parada", "Leque + botton + adesivo + apito + cartão de mesa numa sacolinha. Brinde para testador e para ONG parceira; venda a R$ 49 em evento."),
        ("3. Bar parceiro", "Placa de vitrine + ímã de balcão + 50 cartões de mesa para o lugar que topa ser avaliado. Sem custo para o bar; vira a primeira lista de lugares com nota."),
        ("4. Revenda por ONG", "Grupo Dignidade e Centro de Cidadania vendem com margem para eles. Irisa entra com a arte e a produção."),
    ], "Começar pequeno: 4 peças sob demanda e um kit de brinde. O resto entra quando houver pedido."),
]

def render(slides, title, interna=False):
    body = ""
    n = 0
    for s in slides:
        n += 1
        dark = s["dark"]
        if "how" in s:
            body += f'''
<section class="sl dark">
  <div class="halo h1"></div><div class="grain"></div>
  <header><span class="eb">Lojinha Irisa · {n:02d}</span><h2 class="disp">{s["t"]}</h2></header>
  <div class="how{' dense' if s.get('dense') else ''}">{s["how"]}</div>
  {f'<p class="cap">{s["cap"]}</p>' if s["cap"] else ''}
  <footer><span class="fr">{r(0,0,54)}</span><span class="wm">Irisa</span><i></i><span class="fq">Quanta <b class="rainbow">cor</b> tem esse lugar?</span></footer>
</section>'''
            continue
        body += f'''
<section class="sl {'dark' if dark else 'light'}">
  <div class="halo {'h1' if n%2 else 'h2'}"></div><div class="grain"></div>
  <header><span class="eb">Lojinha Irisa · {n:02d}</span><h2 class="disp">{s["t"]}</h2>{f'<p class="sub">{s["sub"]}</p>' if s["sub"] else ''}</header>
  <div class="art">{s["svg"]}</div>
  <p class="cap">{s["cap"]}</p>
  <footer><span class="fr">{r(0,0,54)}</span><span class="wm">Irisa</span><i></i><span class="fq">Quanta <b class="rainbow">cor</b> tem esse lugar?</span></footer>
</section>'''
    defs = f'''<svg width="0" height="0" style="position:absolute"><defs>
<symbol id="radar" viewBox="0 0 100 100">{radar}</symbol>
<linearGradient id="rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4736F"/><stop offset=".2" stop-color="#F5A45D"/><stop offset=".4" stop-color="#F0CA75"/><stop offset=".6" stop-color="#5CC9B4"/><stop offset=".8" stop-color="#6AA8EE"/><stop offset="1" stop-color="#AE96F2"/></linearGradient>
<linearGradient id="rbv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4736F"/><stop offset=".2" stop-color="#F5A45D"/><stop offset=".4" stop-color="#F0CA75"/><stop offset=".6" stop-color="#5CC9B4"/><stop offset=".8" stop-color="#6AA8EE"/><stop offset="1" stop-color="#AE96F2"/></linearGradient>
<linearGradient id="fNight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2C3256"/><stop offset=".5" stop-color="#1E2340"/><stop offset="1" stop-color="#13172C"/></linearGradient>
<linearGradient id="fCru" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3ECDC"/><stop offset=".5" stop-color="#E6DDC7"/><stop offset="1" stop-color="#D3C7AD"/></linearGradient>
<linearGradient id="fWhite" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#F4F1EB"/><stop offset="1" stop-color="#E3DED4"/></linearGradient>
<radialGradient id="gloss" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000" flood-opacity=".35"/></filter>
<filter id="sh2" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".25"/></filter>
<pattern id="braid" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="11" height="22" fill="#000" opacity=".16"/><rect x="11" width="11" height="22" fill="#fff" opacity=".14"/></pattern>
<pattern id="braid2" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="11" height="22" fill="#000" opacity=".12"/></pattern>
</defs></svg>'''
    robots = '<meta name="robots" content="noindex">' if interna else ""
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">{robots}
<title>{title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@500;600&family=Oswald:wght@300;400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap">
{style}</head>
<body>
{defs}
{body}
{anim}
</body></html>'''

open("docs/lojinha.html", "w").write(render(PUB, "Irisa · Lojinha"))
open("docs/lojinha-interna.html", "w").write(render(PUB + INT, "Irisa · Lojinha (interna)", True))
print(len(PUB), len(PUB) + len(INT))
