# Piano do Reels "O banheiro" (42,5 s), em Fá sustenido maior / Ré sustenido menor: o mesmo tom do
# bordão que o Gemini pôs no clip0-intro (Fá#, Lá#, Dó#, Sol#), para as duas coisas soarem como uma só.
# Escreve piano.mid, toca com o fluidsynth (piano do FluidR3_GM, licença MIT: é timbre, não música de
# terceiros) e grava piano.flac, que fica no repositório: só precisa rodar de novo se a música mudar.
# Uso: python3 piano.py     (apt-get install -y fluidsynth fluid-soundfont-gm; SF2= aponta outro timbre)
import os, random, struct, subprocess
D = os.path.dirname(os.path.abspath(__file__)) + "/"; FF = os.environ.get("FFMPEG", "ffmpeg")
SF2 = os.environ.get("SF2", "/usr/share/sounds/sf2/FluidR3_GM.sf2"); T = 42.5
random.seed(11)
# (segundo, nota MIDI, força 1–127). Cenas: intro 0–7 · corredor 7–18,5 · celular 18,5–25 · porta 25–30,5 · mesa 30,5–37 · fecho.
N = [
 # intro: quatro notas soltas por cima do bordão do Gemini
 (1.4, 73, 38), (3.0, 70, 36), (4.5, 68, 38), (4.6, 61, 30), (5.9, 66, 34),
 # corredor, Ré# menor: contido
 (7.0, 39, 46), (7.92, 46, 38), (8.83, 54, 40), (9.75, 58, 38), (10.67, 54, 36), (11.58, 46, 36),
 (7.45, 70, 52), (10.2, 66, 48), (11.6, 68, 44),
 (12.5, 39, 48), (13.5, 46, 40), (14.5, 53, 42), (15.5, 58, 40), (16.5, 53, 38), (17.5, 46, 36),
 (13.0, 65, 54), (15.0, 63, 50), (16.5, 61, 46), (17.5, 58, 44),
 # celular, Si -> Fá#: a frase sobe (alívio)
 (18.5, 35, 52), (18.5, 47, 46), (19.31, 54, 42), (20.12, 59, 42), (20.94, 54, 40),
 (21.75, 42, 54), (22.56, 49, 44), (23.37, 58, 44), (24.19, 61, 42),
 (18.9, 63, 56), (19.7, 66, 58), (20.5, 71, 62), (21.75, 70, 64), (22.56, 73, 64), (23.37, 78, 68), (24.4, 75, 56),
 # porta, Dó# suspenso -> Ré# menor
 (25.0, 37, 52), (25.0, 44, 44), (25.92, 49, 42), (26.83, 54, 42), (27.75, 39, 52), (28.67, 46, 44), (29.58, 54, 44),
 (25.0, 78, 62), (25.92, 73, 58), (26.83, 68, 56), (27.75, 70, 60), (28.67, 75, 62), (29.3, 78, 64), (29.9, 80, 60),
 # mesa, Si -> Fá# -> Dó# suspenso: arpejo quente
 (30.5, 35, 60), (30.5, 47, 52), (31.58, 54, 46), (32.67, 42, 60), (32.67, 49, 50), (33.75, 58, 46), (34.83, 37, 58), (34.83, 44, 50), (35.9, 49, 46),
 (30.5, 78, 72), (31.04, 75, 64), (31.58, 71, 62), (32.12, 75, 64), (32.67, 82, 76), (33.21, 78, 66), (33.75, 73, 64), (34.29, 78, 66),
 (34.83, 80, 72), (35.37, 78, 64), (35.91, 73, 62), (36.45, 78, 60),
 # fecho, Fá#: resolve e some
 (37.0, 30, 54), (37.0, 42, 50), (37.05, 49, 44), (37.0, 78, 62), (37.04, 70, 50), (38.6, 73, 46), (40.0, 66, 40),
]
PEDAL = [7.0, 12.5, 18.5, 21.75, 25.0, 27.75, 30.5, 32.67, 34.83, 37.0]  # troca de pedal a cada acorde
ev = [(0, bytes([0xC0, 0])), (0, bytes([0xB0, 91, 115])), (0, bytes([0xB0, 64, 127]))]
tk = lambda s: max(0, int(round(s * 480)))  # 60 bpm, 480 ticks por tempo: 1 s = 480 ticks
for t in PEDAL: ev += [(tk(t - .03), bytes([0xB0, 64, 0])), (tk(t + .07), bytes([0xB0, 64, 127]))]
for t, n, v in N:
    t += random.uniform(-.012, .012) + (.02 if n >= 60 else 0); v = max(1, min(127, v + random.randint(-3, 3)))
    ev += [(tk(t), bytes([0x90, n, v])), (tk(t + .7), bytes([0x80, n, 0]))]
ev.append((tk(T + 4), bytes([0xB0, 64, 0])))  # deixa a cauda soar
ev.sort(key=lambda e: e[0])
def vlq(x):
    b = [x & 127]; x >>= 7
    while x: b.append((x & 127) | 128); x >>= 7
    return bytes(reversed(b))
trk = b"\x00\xff\x51\x03" + (1000000).to_bytes(3, "big"); last = 0
for t, m in ev: trk += vlq(t - last) + m; last = t
trk += b"\x00\xff\x2f\x00"
open(D + "piano.mid", "wb").write(b"MThd" + struct.pack(">IHHH", 6, 0, 1, 480) + b"MTrk" + struct.pack(">I", len(trk)) + trk)
subprocess.run(["fluidsynth", "-ni", "-F", D + "piano-cru.wav", "-r", "48000", "-g", "0.9", "-o", "synth.chorus.active=no",
                "-o", "synth.reverb.active=yes", "-o", "synth.reverb.room-size=0.92", "-o", "synth.reverb.damp=0.25",
                "-o", "synth.reverb.level=1.0", "-o", "synth.reverb.width=1.0", SF2, D + "piano.mid"], check=True, stdout=subprocess.DEVNULL)
# abafa o brilho (piano de feltro, íntimo) e corta em 42,5 s
subprocess.run([FF, "-y", "-v", "error", "-i", D + "piano-cru.wav", "-t", str(T), "-af", "highpass=f=30,lowpass=f=3000,lowpass=f=5200",
                "-c:a", "flac", D + "piano.flac"], check=True)
os.remove(D + "piano-cru.wav"); print("ok", D + "piano.flac")
