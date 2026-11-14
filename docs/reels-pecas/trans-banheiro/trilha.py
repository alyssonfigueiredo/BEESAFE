# Trilha original do Reels "O banheiro" (música, 42,5 s; entra aos 7 s), sintetizada: sem música de terceiros, sem custo.
# Uso: python3 trilha.py saida.wav   (precisa de numpy)
# A intro (0–7 s) fica só com o áudio do clipe do Gemini; quem mistura tudo é som.py.
# Arco: corredor contido (Lá menor, casa com o bordão Dó/Sol do clip1) -> alívio (Fá/Dó)
#       -> mesa quente (Fá, Dó, Sol) -> Dó que some.
# As notas foram escritas para a versão de 25 s; M() leva cada tempo para a cena certa da versão longa.
import sys, wave, numpy as np
SR = 44100; T = 42.5; n = int(SR * T); L = np.zeros(n); R = np.zeros(n)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
M = lambda t: float(np.interp(t, [0, 3.6, 7, 11.5, 16, 21, 25], [7, 12.5, 18.5, 25, 30.5, 37, 42.5]))

def put(sig, t0, pan=0.5, g=1.0, cru=False):
    i = int((t0 if cru else M(t0)) * SR); s = sig[: max(0, n - i)]
    L[i:i + len(s)] += s * g * np.cos(pan * np.pi / 2); R[i:i + len(s)] += s * g * np.sin(pan * np.pi / 2)

def piano(m, dur=4.0, vel=1.0):
    t = np.arange(int(dur * SR)) / SR; fr = f(m); o = np.zeros_like(t)
    for k, a in enumerate([1, .5, .28, .14, .07, .035], 1):
        o += a * np.sin(2 * np.pi * fr * k * (1 + .0004 * k * k) * t) * np.exp(-t * (1.1 + .55 * k))
    return o * np.minimum(1, t / .006) * vel * .16

def pad(ms, dur, vel=1.0, atk=None):
    t = np.arange(int(dur * SR)) / SR; o = np.zeros_like(t)
    for m in ms:
        for d in (-.004, 0, .004):
            fr = f(m) * (1 + d)
            o += np.sin(2 * np.pi * fr * t + np.random.rand() * 6) + .25 * np.sin(4 * np.pi * fr * t)
    a = atk or min(1.6, dur / 3); r = min(1.6, dur / 3); env = np.minimum(1, t / a) * np.minimum(1, (dur - t) / r)
    return o * env * vel * .018 * (1 + .12 * np.sin(2 * np.pi * .23 * t))

np.random.seed(7)
# (início, duração, acorde do pad, baixo, força)
SEC = [(0, 3.9, [57, 64, 69], 45, .7), (3.5, 3.9, [57, 60, 64, 71], 45, .8), (7, 2.6, [53, 60, 65, 69], 41, 1.0),
       (9.2, 2.7, [55, 60, 64, 72], 48, 1.1), (11.5, 2.6, [55, 62, 67, 71], 43, 1.1), (13.7, 2.7, [57, 64, 69, 72], 45, 1.15),
       (16, 2.0, [53, 60, 65, 69, 72], 41, 1.3), (17.7, 2.0, [55, 60, 64, 67, 76], 48, 1.35), (19.3, 2.1, [55, 62, 67, 71, 74], 43, 1.35),
       (21, 4.0, [48, 55, 60, 64, 67], 36, 1.2)]
for t0, d, ch, b, v in SEC:
    d = M(t0 + d) - M(t0) + .6
    put(pad(ch, d, v), t0, .35); put(pad([c + 12 for c in ch[:2]], d, v * .4), t0, .7); put(pad([b], d, v * 1.6), t0, .5)
# melodia: notas soltas no corredor, frase que sobe no alívio, arpejo na mesa
MEL = [(0.4, 76, .55), (2.0, 72, .5), (3.7, 71, .5), (5.3, 69, .55), (6.3, 64, .4),
       (7.0, 69, .8), (7.65, 72, .7), (8.3, 77, .85), (9.2, 76, .9), (9.85, 79, .8), (10.5, 84, .9),
       (11.5, 83, .8), (12.15, 79, .7), (12.8, 74, .7), (13.7, 76, .8), (14.35, 81, .8), (15.0, 84, .85), (15.5, 86, .7),
       (16.0, 84, 1), (16.42, 81, .8), (16.84, 77, .8), (17.26, 81, .8), (17.7, 88, 1), (18.12, 84, .8), (18.54, 79, .8), (18.96, 84, .8),
       (19.3, 86, 1), (19.72, 83, .8), (20.14, 79, .8), (20.56, 83, .85), (21.0, 84, 1), (21.0, 76, .7), (22.6, 79, .5), (23.6, 72, .4)]
for i, (t0, m, v) in enumerate(MEL): put(piano(m, 5.5, v), t0, .42 + .16 * (i % 2))
for t0, m in [(7, 41), (9.2, 48), (11.5, 43), (13.7, 45), (16, 41), (17.7, 48), (19.3, 43), (21, 36), (21, 48)]: put(piano(m, 6, .8), t0, .5)
# sala: ecos difusos
for ch in (L, R):
    w = np.zeros(n)
    for dl, g in [(.097, .30), (.149, .26), (.211, .22), (.283, .18), (.367, .15), (.479, .12), (.631, .09), (.811, .07)]:
        k = int((dl + (.013 if ch is R else 0)) * SR); w[k:] += ch[:-k] * g
    w2 = np.zeros(n); k = int(.43 * SR); w2[k:] = w[:-k] * .5; ch += .55 * (w + w2)
t = np.arange(n) / SR; fade = np.minimum(1, t / .5) * np.clip((T - t) / 3.6, 0, 1) ** 1.5
st = np.stack([L, R], 1) * fade[:, None]; st = np.tanh(st / np.abs(st).max() * 1.15) * .86
with wave.open(sys.argv[1], "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((st * 32767).astype("<i2").tobytes())
