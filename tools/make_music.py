"""Synthesise Orbit's built-in music.

Everything here is generated from scratch - sine/saw partials, envelopes and a convolution
reverb - so the tracks are original and safe to ship. No samples, no third-party material.

Three ambient pieces, 48 s each, arranged to loop: the last bars resolve back into the first chord
and the tail is wrapped rather than faded, so `Loop` mode is seamless.
"""
import numpy as np
import wave, subprocess, os

SR = 44100
DUR = 48.0
N = int(SR * DUR)

def note(n):                    # midi -> hz
    return 440.0 * 2 ** ((n - 69) / 12.0)

def env(n, attack, decay, sustain=0.0):
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    e = np.ones(n, np.float32)
    a = min(a, n)
    e[:a] = np.linspace(0, 1, a) ** 1.5
    d = min(d, n - a) if n > a else 0
    if d > 0:
        e[a:a + d] = np.linspace(1, sustain, d)
        if a + d < n:
            e[a + d:] = sustain
    return e

def pad(freqs, t0, dur, detune=0.6, gain=0.25):
    n = int(dur * SR)
    out = np.zeros((n, 2), np.float32)
    for f in freqs:
        for ch, d in ((0, -detune), (1, detune)):
            ph = np.random.uniform(0, 2 * np.pi)
            tt = np.arange(n) / SR
            sig = np.sin(2 * np.pi * f * (1 + d / 1200) * tt + ph)
            sig += 0.35 * np.sin(4 * np.pi * f * (1 + d / 1200) * tt + ph)   # soft 2nd harmonic
            sig += 0.12 * np.sin(6 * np.pi * f * (1 + d / 1200) * tt + ph)
            out[:, ch] += sig.astype(np.float32)
    e = env(n, min(4.0, dur * 0.35), dur * 0.65, sustain=0.45)
    out *= (e * gain)[:, None]
    return out, int(t0 * SR)

def bell(freq, t0, gain=0.3, decay=2.4):
    dur = min(6.0, decay * 2)
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * freq * tt) * 0.6
           + np.sin(2 * np.pi * freq * 2.01 * tt) * 0.25
           + np.sin(2 * np.pi * freq * 3.02 * tt) * 0.1)
    e = np.exp(-tt / decay).astype(np.float32)
    sig = (sig * e * gain).astype(np.float32)
    return np.stack([sig, sig], axis=1), int(t0 * SR)

def reverb(x, seconds=3.2, mix=0.35):
    rng = np.random.default_rng(4)
    n = int(seconds * SR)
    tt = np.arange(n) / SR
    ir = (rng.standard_normal(n) * np.exp(-tt * 2.6)).astype(np.float32)
    ir /= np.abs(ir).sum() ** 0.5
    out = np.zeros_like(x)
    for ch in range(2):
        wet = np.convolve(x[:, ch], ir, mode='full')[:len(x)]
        out[:, ch] = x[:, ch] * (1 - mix) + wet * mix * 2.0
    return out

def render(name, chords, melody, seed=0):
    np.random.seed(seed)
    buf = np.zeros((N, 2), np.float32)

    def place(seg, start):
        end = start + len(seg)
        if start >= N:
            return
        take = min(len(seg), N - start)
        buf[start:start + take] += seg[:take]
        if take < len(seg):                        # wrap the tail -> seamless loop
            tail = min(len(seg) - take, N)
            buf[:tail] += seg[take:take + tail]

    step = DUR / len(chords)
    for i, chord in enumerate(chords):
        seg, off = pad([note(n) for n in chord], 0, step * 1.15, gain=0.28)
        place(seg, off + int(i * step * SR))

    for when, midi, gain in melody:
        seg, off = bell(note(midi), 0, gain=gain)
        place(seg, off + int(when * SR))

    # very low sine for weight
    tt = np.arange(N) / SR
    sub = (0.05 * np.sin(2 * np.pi * note(chords[0][0] - 12) * tt)).astype(np.float32)
    buf[:, 0] += sub
    buf[:, 1] += sub

    buf = reverb(buf)
    buf = np.tanh(buf * 1.15) * 0.9                            # gentle limiting
    peak = np.abs(buf).max()
    if peak > 0:
        buf = buf / peak * 0.82

    pcm = (buf * 32767).astype(np.int16)
    wav = f'/tmp/{name}.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    out = f'src/main/resources/assets/orbit/sounds/music/{name}.ogg'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', '3', out], check=True)
    print(name, round(os.path.getsize(out) / 1e6, 2), 'MB')

# ── Deep Field: slow minor 9th pad, sparse bells ──────────────────────────
render('deep_field',
       [[50, 57, 64, 65], [46, 53, 60, 62], [48, 55, 62, 64], [45, 52, 59, 60]],
       [(3.0, 76, 0.22), (11.0, 72, 0.18), (19.0, 74, 0.20), (27.0, 69, 0.17),
        (33.0, 76, 0.16), (41.0, 71, 0.14)], seed=1)

# ── Starfall: brighter, more movement ────────────────────────────────────
render('starfall',
       [[53, 60, 67, 71], [55, 62, 69, 72], [58, 65, 72, 76], [55, 62, 69, 71]],
       [(1.0, 84, 0.16), (4.5, 79, 0.14), (7.0, 86, 0.15), (10.0, 81, 0.13),
        (14.0, 84, 0.14), (18.0, 88, 0.12), (22.0, 79, 0.15), (26.0, 83, 0.13),
        (30.0, 86, 0.14), (34.0, 81, 0.12), (38.0, 84, 0.13), (43.0, 76, 0.12)], seed=2)

# ── Void Drift: darker, drone-forward ────────────────────────────────────
render('void_drift',
       [[43, 50, 55, 58], [43, 50, 55, 60], [41, 48, 53, 58], [43, 50, 55, 58]],
       [(6.0, 67, 0.16), (16.0, 70, 0.14), (28.0, 65, 0.15), (39.0, 62, 0.13)], seed=3)
