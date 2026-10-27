"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Mic, Pause, Play, Square, Trash2, X } from "lucide-react";
import { adminVoices, type Voice } from "@/app/admin/actions";
import { agoSaid } from "@/lib/t";

const MAX = 180;
/** the recorder's own clock: read in its handlers, never while drawing */
const clock = () => Date.now();
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** the recorder's sound: opus where the phone has it (small at 32 kbit/s), Safari's mp4 otherwise */
const kind = () => ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find((x) => MediaRecorder.isTypeSupported(x)) ?? "";

/**
 * The founder's voice notes on a shop, beside his written one (27 Oct 2026:
 * «notes as a vocal, but super secure»): the mic records — up to three
 * minutes, a tap to keep it, ✕ to throw it — and it is sealed and kept on
 * the server at once (lib/voice.ts). The notes are listed only when opened
 * (the board holds two hundred shops: it carries how many, not the notes),
 * and a note's sound is fetched only when played, into this page's memory —
 * no link to it anywhere, and gone when the page goes.
 */
export function ShopVoice({ id, count, now, list: first = null, className = "mt-2" }: { id: string; count: number; now: number; list?: Voice[] | null; className?: string }) {
  const [list, setList] = useState<Voice[] | null>(first);
  const [open, setOpen] = useState(first !== null && first.length > 0);
  const [n, setN] = useState(first?.length ?? count);
  const [secs, setSecs] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "error" | "denied">("idle");
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream; parts: Blob[]; t0: number; keep: boolean; tick: number } | null>(null);

  // the page leaves while recording: the microphone is let go
  useEffect(
    () => () => {
      const r = rec.current;
      if (!r) return;
      r.keep = false;
      clearInterval(r.tick);
      if (r.mr.state !== "inactive") r.mr.stop();
      r.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const load = async () => {
    setOpen((o) => !o);
    if (list === null) setList(await adminVoices(id).catch(() => []));
  };

  const start = async () => {
    if (rec.current) return;
    setState("idle");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState("denied");
      return;
    }
    const type = kind();
    const mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
    const r = { mr, stream, parts: [] as Blob[], t0: clock(), keep: true, tick: 0 };
    mr.ondataavailable = (e) => e.data.size && r.parts.push(e.data);
    mr.onstop = () => {
      clearInterval(r.tick);
      stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      setSecs(null);
      if (r.keep) void save(new Blob(r.parts, { type: (mr.mimeType || type || "audio/webm").split(";")[0] }), (clock() - r.t0) / 1000);
    };
    r.tick = window.setInterval(() => {
      const s = (clock() - r.t0) / 1000;
      setSecs(s);
      if (s >= MAX) stop(true);
    }, 250);
    rec.current = r;
    setSecs(0);
    mr.start(1000);
  };

  const stop = (keep: boolean) => {
    const r = rec.current;
    if (!r) return;
    r.keep = keep;
    if (r.mr.state !== "inactive") r.mr.stop();
  };

  const save = async (sound: Blob, s: number) => {
    if (s < 1 || sound.size < 200) return;
    setState("saving");
    const fd = new FormData();
    fd.set("shop", id);
    fd.set("secs", String(Math.round(s)));
    fd.set("sound", sound, "note");
    const res = await fetch("/api/admin/voice", { method: "POST", body: fd, credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ ok: boolean; voice?: Voice }>)
      .catch(() => null);
    if (!res?.ok || !res.voice) {
      setState("error");
      return;
    }
    setState("idle");
    setList((l) => [res.voice!, ...(l ?? [])]);
    setN((x) => x + 1);
    setOpen(true);
  };

  const recording = secs !== null;
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <span className="flex h-9 items-center gap-2 rounded-full bg-coral-soft pe-1 ps-3 text-[0.8125rem] font-bold text-coral">
            <span className="size-2 animate-pulse rounded-full bg-coral" aria-hidden />
            <span className="num">{mmss(secs)}</span>
            <button type="button" onClick={() => stop(true)} className="press flex h-7 items-center gap-1 rounded-full bg-coral px-2.5 text-[0.75rem] text-white">
              <Square className="size-3 fill-white" /> سجّل
            </button>
            <button type="button" onClick={() => stop(false)} aria-label="فسّخ الفوكال" className="press grid size-7 place-items-center rounded-full text-coral">
              <X className="size-4" />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => void start()} disabled={state === "saving"} className="press flex h-9 items-center gap-1.5 rounded-full bg-canvas px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line disabled:opacity-60">
            <Mic className="size-4 text-brand" /> {state === "saving" ? "يتسجّل…" : "فوكال"}
          </button>
        )}
        {n > 0 && !recording && (
          <button type="button" onClick={() => void load()} aria-expanded={open} className="press flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-[0.8125rem] font-semibold text-brand">
            <Play className="size-3.5 fill-brand" /> <span className="num">{n}</span> {n === 1 ? "فوكال" : "فوكالات"}
          </button>
        )}
        {state === "denied" && <span className="text-[0.75rem] font-semibold text-coral">المايك ممنوع: حلّو من الإعدادات متاع الموقع</span>}
        {state === "error" && <span className="text-[0.75rem] font-semibold text-coral">ما تسجّلش، عاود</span>}
      </div>
      {open && (
        <div className="mt-1.5 space-y-1">
          {list === null && <p className="text-[0.75rem] text-faint">…</p>}
          {list?.map((v) => (
            <VoiceLine
              key={v.id}
              v={v}
              now={now}
              onGone={() => {
                setList((l) => (l ?? []).filter((x) => x.id !== v.id));
                setN((x) => Math.max(0, x - 1));
              }}
            />
          ))}
          <p className="flex items-center gap-1 text-[0.6875rem] text-faint">
            <Lock className="size-3" /> مشفّرين، يتسمعو كان من الأدمين
          </p>
        </div>
      )}
    </div>
  );
}

/** One voice note: play it (its sound fetched the first time, into this page only), and take it back (asked first). */
function VoiceLine({ v, now, onGone }: { v: Voice; now: number; onGone: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  useEffect(
    () => () => {
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  const toggle = async () => {
    if (playing) {
      audio.current?.pause();
      return;
    }
    if (!audio.current) {
      setBusy(true);
      const blob = await fetch(`/api/admin/voice/${v.id}`, { credentials: "same-origin", cache: "no-store" })
        .then((r) => (r.ok ? r.blob() : null))
        .catch(() => null);
      setBusy(false);
      if (!blob) return;
      url.current = URL.createObjectURL(blob);
      const a = new Audio(url.current);
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onended = () => setPlaying(false);
      audio.current = a;
    }
    void audio.current.play().catch(() => setPlaying(false));
  };

  const drop = async () => {
    if (!sure) {
      setSure(true);
      setTimeout(() => setSure(false), 3000);
      return;
    }
    const ok = await fetch(`/api/admin/voice/${v.id}`, { method: "DELETE", credentials: "same-origin" })
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) {
      audio.current?.pause();
      onGone();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-[0.75rem] bg-canvas/70 py-1 pe-1 ps-1">
      <button type="button" onClick={() => void toggle()} disabled={busy} aria-label={playing ? "وقّف" : "اسمع"} className="press grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-60">
        {busy ? <span className="size-2 animate-pulse rounded-full bg-white" /> : playing ? <Pause className="size-3.5 fill-white" /> : <Play className="size-3.5 translate-x-[1px] fill-white" />}
      </button>
      <span className="num text-[0.8125rem] font-bold text-ink">{mmss(v.secs)}</span>
      <span className="min-w-0 flex-1 truncate text-[0.75rem] text-muted">{agoSaid(Math.max(0, now - Date.parse(v.at)))}</span>
      <button type="button" onClick={() => void drop()} aria-label="امسح الفوكال" className={`press flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[0.75rem] font-bold ${sure ? "bg-coral text-white" : "text-muted"}`}>
        <Trash2 className="size-3.5" /> {sure ? "امسح؟" : ""}
      </button>
    </div>
  );
}
