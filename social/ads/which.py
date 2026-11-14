"""
Which of two wordings was said: `python which.py <questions.json> [model]`
— questions: [{key, take, a, z, texts: ["…", "…"]}].

Hearing a stretch again (relisten.py) gives one answer; when two answers stay possible («تليفونو» or
«تليفونك»?), this asks the other way round: each wording is laid on the sound (Whisper made to read
exactly those words) and it says how well each one fits — the sum of the log-probabilities of its
pieces, and the weakest word. The wording that fits best, by a clear margin, is the one said.
"""
import json, math, os, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import pad_or_trim
from faster_whisper.tokenizer import Tokenizer

FF = os.environ.get("FFMPEG", "ffmpeg")
questions = json.load(open(sys.argv[1], encoding="utf-8"))
model = WhisperModel(sys.argv[2] if len(sys.argv) > 2 else "large-v3-turbo", device="cpu", compute_type="int8")
tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task="transcribe", language="ar")
cache = {}
def load(take):
    if take not in cache:
        raw = subprocess.run([FF, "-v", "error", "-i", take, "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"], capture_output=True, check=True).stdout
        cache[take] = np.frombuffer(raw, dtype=np.float32)
    return cache[take]
out = {}
for q in questions:
    audio = load(q["take"])[max(0, int((q["a"] - 0.15) * 16000)) : int((q["z"] + 0.2) * 16000)]
    features = model.feature_extractor(audio)
    frames = features.shape[-1]
    encoded = model.encode(pad_or_trim(features))
    rows = []
    for text in q["texts"]:
        tokens = tokenizer.encode(" " + text.strip())
        res = model.model.align(encoded, tokenizer.sot_sequence, [tokens], frames, median_filter_width=7)[0]
        probs = [max(1e-9, float(p)) for p in res.text_token_probs][: len(tokens)]
        words, word_tokens = tokenizer.split_to_word_tokens(tokens)
        at, weakest = 0, ("", 1.0)
        for w, t in zip(words, word_tokens):
            p = float(np.mean(probs[at : at + len(t)])) if t else 1.0
            at += len(t)
            if w.strip() and p < weakest[1]:
                weakest = (w.strip(), p)
        rows.append({"text": text, "fit": round(sum(math.log(p) for p in probs), 2), "pieces": len(probs), "weakest": weakest[0], "p": round(weakest[1], 3)})
    rows.sort(key=lambda r: -r["fit"])
    out[q["key"]] = rows
    print(f"\n{q['key']}", flush=True)
    for r in rows:
        print(f"  {r['fit']:8.2f}  ({r['pieces']} pieces, weakest «{r['weakest']}» {r['p']})  {r['text']}", flush=True)
json.dump(out, open(sys.argv[1].replace(".json", ".out.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
