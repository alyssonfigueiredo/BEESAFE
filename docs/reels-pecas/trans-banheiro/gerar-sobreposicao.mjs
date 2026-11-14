// Gera as páginas das peças das 2 semanas (reels animados, carrossel, post, stories) no estilo da skill irisa-posts.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const dir = new URL(".", import.meta.url).pathname; // grava em ./html/; copiar o resultado para sobreposicao.html
const sk = "/home/user/BEESAFE/.claude/skills/irisa-posts/";
const base = readFileSync(sk + "base.css", "utf8").replace(/^@import.*$/m, "");
const radar = readFileSync(sk + "radar.svgfrag", "utf8");
mkdirSync(dir + "html", { recursive: true });

const head = (title, extra = "") => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@500;600&family=Oswald:wght@300;400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>${base}
.big .xl{font-weight:300}
.night{--paper:#141829;--surface:rgba(255,255,255,.08);--subtle:rgba(255,255,255,.06);--border:rgba(255,255,255,.14);--ink:#FFFFFF;--muted:#C8CCDC;--dim:#8E96AE;
  --coralInk:#FF8D89;--orangeInk:#FFBB7A;--yellowInk:#FFDE95;--turqInk:#6FE7D0;--lilacInk:#C3ABFF;--pane:rgba(255,255,255,.08);--pane-edge:rgba(255,255,255,.16);
  --shadow-card:0 2px 4px rgba(0,0,0,.22),0 18px 44px rgba(0,0,0,.34);--glass-inset:inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 0 1px var(--pane-edge)}
.night .bg{opacity:.85;mix-blend-mode:screen;filter:saturate(.8)}
${extra}</style></head><body style="margin:0;padding:0;gap:0;background:#ccc">
<svg style="position:absolute;width:0;height:0" aria-hidden="true"><defs>${radar}</defs></svg>`;
const brandSvg = `<svg class="mark" viewBox="0 0 100 100"><use href="#radarmin"></use></svg><span>Iris<b>a</b></span>`;
const handle = (d) => `<div class="handle" data-d="${d}"><svg viewBox="0 0 100 100"><use href="#radarmark"></use></svg><span>@appirisa</span></div>`;

// ---------- REELS ----------
const reelCss = `
#stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--paper);color:var(--ink)}
.halo{position:absolute;inset:-30%;pointer-events:none;filter:blur(70px)}
.h1{background:radial-gradient(28% 20% at 22% 30%,color-mix(in srgb,var(--turq) 30%,transparent),transparent 70%),radial-gradient(26% 18% at 80% 70%,color-mix(in srgb,var(--lilac) 28%,transparent),transparent 70%)}
.h2{background:radial-gradient(22% 16% at 76% 20%,color-mix(in srgb,var(--coral) 24%,transparent),transparent 70%),radial-gradient(22% 16% at 24% 84%,color-mix(in srgb,var(--yellow) 26%,transparent),transparent 70%)}
.night .halo{opacity:.5}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;opacity:0;padding:220px 80px 540px}
#stage>.brand{bottom:440px;left:0;right:0;justify-content:center;font-size:30px}
.handle{display:flex;align-items:center;gap:22px;font-family:var(--wordmark);font-weight:500;letter-spacing:.12em;font-size:64px;line-height:1;color:var(--ink);margin-top:70px}
.handle svg{width:72px;height:72px}
.w{display:inline-block}
.qcard{background:var(--surface)}
.chat{width:900px;background:#fff;color:#141829;border-radius:36px;box-shadow:var(--shadow-card);overflow:hidden;display:flex;flex-direction:column}
.chat .top{display:flex;align-items:center;gap:20px;padding:28px 36px;border-bottom:1px solid var(--border)}
.chat .top .gav{display:flex}.chat .top .gav i{width:54px;height:54px;border-radius:50%;margin-left:-14px;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-family:var(--body);font-weight:700;font-size:22px;color:#141829}
.chat .top .gav i:first-child{margin-left:0}
.chat .top b{font-family:var(--body);font-weight:700;font-size:34px;display:block}.chat .top span{font-size:24px;color:var(--dim)}
.chat .msgs{padding:34px 32px 40px;display:flex;flex-direction:column;gap:22px;min-height:860px;background:#F7F6F3}
.bub{color:#141829;max-width:640px;padding:22px 30px;border-radius:30px;font-family:var(--body);font-size:38px;line-height:1.3;background:#fff;box-shadow:0 2px 6px rgba(20,24,41,.06);align-self:flex-start}
.bub small{display:block;font-size:24px;font-weight:700;margin-bottom:4px}
.bub.me{align-self:flex-end;background:color-mix(in srgb,var(--turq) 30%,#fff)}
.dots{display:flex;gap:10px;padding:30px 34px}.dots i{width:16px;height:16px;border-radius:50%;background:#B9B5AC;display:block}
.row{display:flex;align-items:center;gap:30px;width:900px;padding:30px 40px;border-radius:var(--r-lg);background:var(--surface);box-shadow:var(--shadow-card);font-family:var(--body);font-size:46px;font-weight:600}
.box{width:64px;height:64px;border-radius:18px;border:5px solid var(--border);flex:none;position:relative}
.box i{position:absolute;inset:-5px;border-radius:18px;background:var(--turq);display:flex;align-items:center;justify-content:center;opacity:0}
.box i svg{width:40px;height:40px}
.place{width:900px;background:#fff;border-radius:var(--r-xl);box-shadow:var(--shadow-card);display:flex;gap:30px;padding:30px;align-items:center;position:relative}
.place .tile{width:180px;height:180px;border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--orange) 70%,#fff),var(--coral));flex:none;display:flex;align-items:flex-end;padding:18px;font-family:var(--body);font-weight:700;font-size:26px;color:#141829;letter-spacing:.08em}
.place b{display:block;font-family:var(--body);font-size:44px;font-weight:700}
.place span{font-size:30px;color:var(--dim)}
.heart{position:absolute;top:28px;right:30px;width:96px;height:96px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:40px;width:900px}
.col h4{margin:0 0 22px;font-family:var(--body);font-weight:700;font-size:30px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);text-align:center}
.col .slot{height:180px;border-radius:var(--r-lg);border:4px dashed var(--border)}
.mini{position:absolute;width:430px;height:180px;background:#fff;border-radius:var(--r-lg);box-shadow:var(--shadow-card);display:flex;align-items:center;gap:20px;padding:22px}
.mini .tile{width:120px;height:120px;border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--orange) 70%,#fff),var(--coral))}
.mini b{font-family:var(--body);font-size:32px;font-weight:700;display:block}.mini span{font-size:24px;color:var(--dim)}
`;
const reel = (name, total, scenes, opts = {}) => {
  const html = head("Irisa · " + name, reelCss + (opts.css || "")) + `<div id="stage" class="${opts.night ? "night" : ""}">
<div class="bg"></div><div class="halo h1"></div><div class="halo h2"></div>
${scenes}
<div class="brand" id="brand">${brandSvg}</div></div>
<script>
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const EO="cubic-bezier(.2,.7,.2,1)",BACK="cubic-bezier(.3,1.4,.4,1)";
const A=(el,kf,start,dur,ease=EO,extra={})=>el&&el.animate(kf,Object.assign({delay:start,duration:dur,easing:ease,fill:"both"},extra));
const IN=[{opacity:0,transform:"translateY(40px)",filter:"blur(14px)"},{opacity:1,transform:"none",filter:"blur(0)"}];
const POP=[{opacity:0,transform:"translateY(24px) scale(.9)"},{opacity:1,transform:"none"}];
const TOTAL=${total};
A($(".h1"),[{transform:"translate(0,0) rotate(0)"},{transform:"translate(6%,-5%) rotate(10deg)"}],0,9000,"ease-in-out",{iterations:Infinity,direction:"alternate"});
A($(".h2"),[{transform:"translate(0,0) rotate(0)"},{transform:"translate(-6%,4%) rotate(-8deg)"}],0,11000,"ease-in-out",{iterations:Infinity,direction:"alternate"});
A($("#brand"),[{opacity:0},{opacity:1}],300,600,"linear");
$$(".scene").forEach(s=>{const a=+s.dataset.a,b=+s.dataset.b,last=b>=TOTAL;
  const dur=b-a;
  A(s,last?[{opacity:0},{opacity:1,offset:600/dur},{opacity:1}]:[{opacity:0,transform:"none",filter:"blur(0)"},{opacity:1,transform:"none",filter:"blur(0)",offset:600/dur},{opacity:1,transform:"none",filter:"blur(0)",offset:(dur-1000)/dur},{opacity:0,transform:"translateY(-50px)",filter:"blur(12px)"}],a,dur,"linear");
  s.querySelectorAll("[data-d]").forEach(el=>{const d=a+ +el.dataset.d,fx=el.dataset.fx||"in";
    if(fx==="in")A(el,IN,d,1500,"cubic-bezier(.25,.6,.3,1)");
    else if(fx==="pop")A(el,POP,d,1100,EO);
    else if(fx==="grow")A(el,[{transform:"scaleX(0)"},{transform:"scaleX(1)"}],d,700);
    else if(fx==="show")A(el,[{opacity:0},{opacity:1}],d,500,"linear");
    else if(fx==="hide")A(el,[{opacity:1},{opacity:0}],d,200,"linear");
    else if(fx==="check")A(el,[{opacity:0,transform:"scale(.4)"},{opacity:1,transform:"scale(1)"}],d,380,BACK);
    else if(fx==="heart")A(el,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1.25)",offset:.6},{opacity:1,transform:"scale(1)"}],d,650);
    else if(fx==="move")A(el,[{transform:"translateX(0)"},{transform:"translateX("+el.dataset.x+"px)"}],d,800);
    else if(fx==="rise")A(el,[{opacity:0,transform:"translateY(160px)"},{opacity:1,transform:"none"}],d,900);
    else if(fx==="flicker")A(el,[{opacity:1},{opacity:.35},{opacity:1},{opacity:.6},{opacity:1}],d,1400,"linear",{iterations:Infinity});
  });
  s.querySelectorAll(".dots i").forEach((dt,i)=>A(dt,[{transform:"translateY(0)",opacity:.5},{transform:"translateY(-10px)",opacity:1},{transform:"translateY(0)",opacity:.5}],a+i*150,700,"ease-in-out",{iterations:Infinity}));
});
${opts.js || ""}
window.__setT=t=>{document.getAnimations().forEach(x=>{x.pause();x.currentTime=t})};window.__TOTAL=TOTAL;
const Q=new URLSearchParams(location.search);
if(!Q.has("capture")){let t0=performance.now();(function L(n){window.__setT((n-t0)%TOTAL);requestAnimationFrame(L)})(t0)}else window.__setT(0);
</script></body></html>`;
  writeFileSync(dir + "html/" + name + ".html", html);
};
const sc = (a, b, inner, style = "") => `<div class="scene" data-a="${a}" data-b="${b}" style="${style}">${inner}</div>`;
const L = (txt, d, cls = "") => `<span class="w ${cls}" data-d="${d}">${txt}</span>`;
const big = (size, lines) => `<h1 class="big c" style="font-size:${size}px">${lines.join("<br>")}</h1>`;
const eb = (txt, d, color = "var(--turqInk)") => `<div class="eyebrow c" data-d="${d}" style="color:${color};margin-bottom:40px">${txt}</div>`;
const check = `<svg viewBox="0 0 24 24" fill="none" stroke="#141829" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>`;
const heartOutline = `<svg viewBox="0 0 24 24" style="position:absolute;inset:0" fill="none" stroke="#C9C6BE" stroke-width="1.8"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>`;
const heartFull = `<svg viewBox="0 0 24 24" style="position:absolute;inset:0"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6964"/><stop offset=".35" stop-color="#FFD066"/><stop offset=".65" stop-color="#49DCC0"/><stop offset="1" stop-color="#A889FF"/></linearGradient></defs><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="url(#hg)"/></svg>`;


// Reels "O banheiro" (Semana da Visibilidade Trans): texto por cima dos clipes do Gemini (fundo transparente).
const tcss = `
#stage{background:transparent!important}
#stage>.bg,#stage>.halo{display:none}
.scene{justify-content:flex-end;padding-bottom:570px}
.big,.eyebrow,.body{text-shadow:0 4px 30px rgba(0,0,0,.55)}
.grad{position:absolute;left:0;right:0;pointer-events:none}
.gt{top:0;height:500px;background:linear-gradient(rgba(12,14,26,.5),transparent)}
.gb{bottom:0;height:1350px;background:linear-gradient(transparent,rgba(12,14,26,.5) 36%,rgba(12,14,26,.64) 62%,rgba(12,14,26,.5))}
#stage>.brand{z-index:5}
.fim{background:#141829;justify-content:center;padding-top:220px;padding-bottom:540px}
.fim .bgx{position:absolute;inset:0;background:radial-gradient(40% 25% at 15% 10%,color-mix(in srgb,var(--turq) 40%,transparent),transparent 70%),radial-gradient(40% 25% at 90% 90%,color-mix(in srgb,var(--lilac) 40%,transparent),transparent 70%),radial-gradient(35% 22% at 85% 15%,color-mix(in srgb,var(--coral) 35%,transparent),transparent 70%),radial-gradient(35% 22% at 10% 88%,color-mix(in srgb,var(--yellow) 30%,transparent),transparent 70%);opacity:.85;mix-blend-mode:screen;filter:saturate(.8)}
.fim>*:not(.bgx){position:relative}
.dip{position:absolute;inset:0;background:#090B15;opacity:0;z-index:4;pointer-events:none}
.intro .big{font-weight:300;white-space:nowrap}
.ficha{width:880px;background:rgba(20,24,41,.6);color:#fff;border-radius:36px;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 0 0 1.5px rgba(255,255,255,.16),0 18px 50px rgba(0,0,0,.28);padding:44px 48px;margin-top:44px;text-shadow:0 2px 10px rgba(0,0,0,.45)}
.ficha .lb{font-family:var(--body);font-weight:700;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:#FFD166}
.ficha h3{margin:12px 0 6px;font-family:var(--body);font-weight:700;font-size:52px}
.ficha p{margin:0 0 30px;font-family:var(--body);font-size:32px;color:#E6ECF3}
.ficha .rb{display:flex;gap:12px}.ficha .rb i{flex:1;height:30px;border-radius:15px;background:rgba(255,255,255,.22);position:relative;overflow:hidden}
.ficha .rb i b{position:absolute;inset:0;border-radius:15px}
`;
const rbc = ["var(--coral)", "var(--orange)", "var(--yellow)", "var(--turq)", "var(--lilac)"];
const ficha = `<div class="ficha" data-d="2200" data-fx="pop"><div class="lb">Banheiro</div><h3>E o banheiro?</h3><p>Usou o que quis, sem ser questionade.</p>
<div class="rb">${rbc.map((c, i) => `<i><b data-d="${3300 + i * 280}" data-fx="show" style="background:${c}"></b></i>`).join("")}</div></div>`;
// Intro (0–7 s): clipe do Gemini (clip0-intro, a porta no corredor escuro) com o texto por cima;
// aos 7 s um mergulho rápido no escuro cobre o corte para o clip1.
const intro = `<div class="dip"></div>` +
  sc(0, 7000, big(76, [L("Tem uma porta", 800, "xl"), L("que quase ninguém repara.", 2000, "xl")]) +
    `<div class="eyebrow c" data-d="3400" style="color:var(--turqInk);margin-top:60px">Semana da Visibilidade Trans</div>`).replace('class="scene"', 'class="scene intro"');
const introJs = `A($(".dip"),[{opacity:0},{opacity:1,offset:.45},{opacity:1,offset:.55},{opacity:0}],6550,900,"ease-in-out");`;
reel("trans-banheiro", 42500,
  `<div class="grad gt"></div><div class="grad gb"></div>` + intro +
  sc(7000, 12500, big(112, [L("Pra muita gente,", 400, "xl"), L("é só um banheiro.", 1500)])) +
  sc(12500, 18500, big(100, [L("Pra mim, é a parte", 300, "xl"), L("do rolê que eu penso", 1300, "xl"), L("<span class=rainbow>antes de sair.</span>", 2400)])) +
  sc(18500, 25000, big(86, [L("Alguém já", 300, "xl"), L("tinha respondido.", 1200)]) + ficha) +
  sc(25000, 30500, big(108, [L("Quem esteve lá", 400, "xl"), L("<span class=rainbow>contou como foi.</span>", 1600)])) +
  sc(30500, 37000, big(100, [L("Ninguém devia", 400, "xl"), L("precisar de coragem", 1500, "xl"), L("<span class=rainbow>pra ir ao banheiro.</span>", 2700)])) +
  `<div class="scene fim" data-a="37000" data-b="42500"><div class="bgx"></div>` + big(110, [L("Avalia o banheiro", 400, "xl"), L("<span class=rainbow>também.</span>", 1400)]) +
  `<div class="body c" data-d="2400" style="margin-top:40px;font-size:42px;color:var(--muted)">Alguém vai ler antes de sair.</div>` + handle(3100) + `</div>`,
  { night: true, css: tcss, js: introJs });
