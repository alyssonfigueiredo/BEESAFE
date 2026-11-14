# Som do Reels "O banheiro" (42,5 s). Três camadas, todas em Fá sustenido:
#  1) o áudio original dos clipes do Gemini (lâmpada, porta, passos, bar), nos mesmos cortes do vídeo;
#  2) o bordão grave da intro do Gemini esticado (paulstretch) por baixo do vídeo todo: é o "clima";
#  3) o piano de piano.py (piano.flac) na frente.
# Uso: python3 som.py saida.wav   Os cortes têm que bater com CORTES em render.mjs. FFMPEG= aponta outro binário.
import subprocess, sys, os, numpy as np, wave
D = os.path.dirname(os.path.abspath(__file__)) + "/"; FF = os.environ.get("FFMPEG", "ffmpeg")
SR = 48000; T = 42.5; n = int(SR * T); mix = np.zeros((n, 2)); np.random.seed(3)

def ler(args):
    raw = subprocess.run([FF, "-v", "error", *args, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").reshape(-1, 2).astype(float)

def nivel(x, p=60):  # nível típico em dB: percentil do RMS em janelas de 50 ms (um estalo forte não puxa a conta)
    w = int(.05 * SR); k = len(x) // w; r = np.sqrt((x[: k * w].reshape(k, w, 2) ** 2).mean((1, 2)) + 1e-12)
    return 20 * np.log10(np.percentile(r, p))

def por(nome, x, t0, alvo, fin, fout, p=60, teto=.25):
    g = alvo - nivel(x, p); x = teto * np.tanh(x * 10 ** (g / 20) / teto)  # o tanh segura estalo e batida de porta
    e = np.ones(len(x)); a = int(fin * SR); b = int(fout * SR)
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2; e[len(x) - b:] = np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    i = int(t0 * SR); x = (x * e[:, None])[: n - i]; mix[i:i + len(x)] += x
    print("%-6s %5.1f–%5.1f s  ganho %+5.1f dB" % (nome, t0, t0 + len(x) / SR, g))

def esticar(x, vezes, jan=.3):  # paulstretch: estica sem mudar o tom e desmancha qualquer estalo; sobra só o timbre
    N = int(jan * SR) // 2 * 2; w = (1 - np.linspace(-1, 1, N) ** 2) ** 1.25; out = np.zeros((int(len(x) * vezes) + N, 2)); pos = 0.0; o = 0
    while pos < len(x) - N and o + N <= len(out):
        for c in (0, 1):
            F = np.abs(np.fft.rfft(x[int(pos):int(pos) + N, c] * w))
            out[o:o + N, c] += np.fft.irfft(F * np.exp(2j * np.pi * np.random.rand(len(F)))) * w
        pos += N / 2 / vezes; o += N // 2
    return out[:o]

LIMPA = "highpass=f=100,bandreject=f=120:width_type=h:w=24"  # tira o zumbido elétrico de fundo
#   nome     entrada do ffmpeg                                                      início  alvo  entra  sai
por("intro", ler(["-t", "7.3", "-i", D + "clip0-intro.mp4"]),                          0.0, -25, .15, .9)
# clip1: 1,15x mais lento e 6 semitons abaixo — o bordão dele é Dó/Sol e assim vira Fá#/Dó#, o tom do resto
por("clip1", ler(["-i", D + "clip1-corredor.mp4", "-af", "rubberband=tempo=0.869565:pitch=0.707107"]), 7.0, -31, .6, .5, 85)
por("clip2", ler(["-ss", "0.1", "-t", "6.9", "-i", D + "clip2-celular.mp4", "-af", LIMPA]), 18.3, -34, .4, .4)
por("clip3", ler(["-ss", "0.8", "-t", "6.8", "-i", D + "clip3-porta.mp4"]),           24.8, -31, .4, 1.0)   # a batida da porta soa até 31,6 s
por("clip4", ler(["-ss", "0.3", "-i", D + "clip4-mesa.mp4", "-af", LIMPA]),           30.3, -33, .5, 3.0)   # o bar segue por baixo do fecho
# bordão: o fim do clip0 (porta fechada, só o som grave) esticado 12x, dos 6 s até o fim; cresce na mesa
b = esticar(ler(["-ss", "6.8", "-i", D + "clip0-intro.mp4", "-af", "highpass=f=38"]), 12)[: int(36.5 * SR)]
tb = 6 + np.arange(len(b)) / SR; b *= np.interp(tb, [6, 9, 18.5, 30.5, 34, 37, 42.5], [0, .8, .8, .9, 1.25, 1.0, .5])[:, None]
por("bordão", b, 6.0, -31, .1, .1)
# piano na frente
por("piano", ler(["-i", D + "piano.flac"])[:n], 0.0, -20, .01, .01, 90, teto=.6)
t = np.arange(n) / SR; mix *= np.clip((T - t) / 2.2, 0, 1)[:, None] ** 1.3
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
