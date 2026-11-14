# Som do Reels "O banheiro": o áudio original dos clipes do Gemini (bordão grave, lâmpada, porta, bar)
# na frente e a trilha.py baixinha por baixo, a partir dos 7 s. Uso: python3 som.py saida.wav
# Os cortes têm que bater com CORTES em render.mjs. FFMPEG= aponta outro binário.
import subprocess, sys, os, numpy as np, wave, tempfile
D = os.path.dirname(os.path.abspath(__file__)) + "/"; FF = os.environ.get("FFMPEG", "ffmpeg")
SR = 48000; T = 42.5; n = int(SR * T); mix = np.zeros((n, 2))

def ler(args):
    raw = subprocess.run([FF, "-v", "error", *args, "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").reshape(-1, 2).astype(float)

def nivel(x, p=60):  # nível típico em dB: percentil do RMS em janelas de 50 ms (um estalo forte não puxa a conta)
    w = int(.05 * SR); k = len(x) // w; r = np.sqrt((x[: k * w].reshape(k, w, 2) ** 2).mean((1, 2)) + 1e-12)
    return 20 * np.log10(np.percentile(r, p))

def por(nome, x, t0, alvo, fin, fout, p=60):
    g = alvo - nivel(x, p); x = .25 * np.tanh(x * 10 ** (g / 20) / .25); e = np.ones(len(x)); a = int(fin * SR); b = int(fout * SR)  # o tanh segura estalo e batida de porta em -12 dB
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2; e[len(x) - b:] = np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    i = int(t0 * SR); x = (x * e[:, None])[: n - i]; mix[i:i + len(x)] += x
    print("%-6s %5.1f–%5.1f s  ganho %+5.1f dB" % (nome, t0, t0 + len(x) / SR, g))

LIMPA = "highpass=f=100,bandreject=f=120:width_type=h:w=24"  # tira o zumbido elétrico de fundo
#   nome     entrada do ffmpeg                                                      início  alvo  entra  sai
por("intro", ler(["-t", "7.3", "-i", D + "clip0-intro.mp4"]),                          0.0, -24, .15, .9)
por("clip1", ler(["-i", D + "clip1-corredor.mp4", "-af", "atempo=0.869565"]),          7.0, -27, .6, .5, 85)  # 1,15x mais lento
por("clip2", ler(["-ss", "0.1", "-t", "6.9", "-i", D + "clip2-celular.mp4", "-af", LIMPA]), 18.3, -33, .4, .4)
por("clip3", ler(["-ss", "0.8", "-t", "6.8", "-i", D + "clip3-porta.mp4"]),           24.8, -30, .4, 1.0)   # a batida da porta soa até 31,6 s
por("clip4", ler(["-ss", "0.3", "-i", D + "clip4-mesa.mp4", "-af", LIMPA]),           30.3, -31, .5, 3.0)   # o bar segue por baixo do fecho
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run([sys.executable, D + "trilha.py", tmp + "/t.wav"], check=True)
    m = ler(["-i", tmp + "/t.wav"])[:n]
mix[: len(m)] += m * 10 ** (-6 / 20)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
