"""
A stretch of a take heard again, alone and with nothing whispered to it:
`python relisten.py <jobs.json> [model …]` — jobs: [{key, take, a, z}], models: large-v3-turbo, medium…

take.mjs says where the voice did not say the script's words. To write the film's line the way it
was really said, that stretch is heard again by itself — by more than one model, since each hears
Derja a little differently — and the answers are printed side by side.
"""
import json, os, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

FF = os.environ.get("FFMPEG", "ffmpeg")
jobs = json.load(open(sys.argv[1], encoding="utf-8"))
models = sys.argv[2:] or ["large-v3-turbo"]
cache = {}
def load(take):
    if take not in cache:
        raw = subprocess.run([FF, "-v", "error", "-i", take, "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"], capture_output=True, check=True).stdout
        cache[take] = np.frombuffer(raw, dtype=np.float32)
    return cache[take]
out = {j["key"]: {} for j in jobs}
for name in models:
    model = WhisperModel(name, device="cpu", compute_type="int8")
    for j in jobs:
        audio = load(j["take"])[max(0, int((j["a"] - 0.2) * 16000)) : int((j["z"] + 0.25) * 16000)]
        segments, _ = model.transcribe(audio, language="ar", task="transcribe", beam_size=5, vad_filter=False, condition_on_previous_text=False, temperature=0)
        out[j["key"]][name] = " ".join(s.text.strip() for s in segments)
        print(f"{j['key']:10s} {name:16s} {out[j['key']][name]}", flush=True)
json.dump(out, open(sys.argv[1].replace(".json", ".out.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
