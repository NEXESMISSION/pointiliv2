"""
Takes heard word by word: `python hear.py <jobs.json>` — a list of {take, out, prompt}.

Whisper (faster-whisper, large-v3-turbo, on this computer's CPU) with the time of every word. The
film's own lines are whispered to it first (prompt): it then writes the words the way the script
does, which is what take.mjs needs to find each line in the take. One model for the whole list.

The sound is read by ffmpeg (FFMPEG=path, else the one on the PATH) as 16 kHz mono: no other
decoder to install or to disagree with.
"""
import json, os, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

FF = os.environ.get("FFMPEG", "ffmpeg")
jobs = json.load(open(sys.argv[1], encoding="utf-8"))
model = WhisperModel(os.environ.get("WHISPER", "large-v3-turbo"), device="cpu", compute_type="int8")
for job in jobs:
    raw = subprocess.run([FF, "-v", "error", "-i", job["take"], "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32)
    segments, info = model.transcribe(
        audio, language="ar", task="transcribe", word_timestamps=True, initial_prompt=job.get("prompt") or None,
        # with nothing whispered to it, each stretch is heard for itself (a second, unbiased hearing)
        beam_size=5, vad_filter=False, condition_on_previous_text=bool(job.get("prompt")), temperature=0,
    )
    words, text = [], []
    for s in segments:
        text.append(s.text.strip())
        for w in s.words or []:
            words.append({"w": w.word.strip(), "a": round(float(w.start), 3), "z": round(float(w.end), 3), "p": round(float(w.probability), 3)})
    json.dump({"duration": len(audio) / 16000, "text": " ".join(text), "words": words}, open(job["out"], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{os.path.basename(job['out'])}: {len(words)} words · {len(audio) / 16000:.1f} s", flush=True)
