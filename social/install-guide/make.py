# Two animated pictures, a short film each: putting Pointili on the home screen,
# on an iPhone (Safari, iOS 26) and on Android (Chrome). One phone; a finger
# goes to each button and taps it; the menus and sheets open as they do on the
# phone; the words under the phone say each step. Portrait 1080x1920, it loops.
#
# And the app's own (v2/public/clips/install-*-v1.svg, components/InstallGuide.tsx):
# the phone alone, with no words in it — the app writes each step under it, in its
# own type, and those words move with the film because the film's style carries
# their timing too (classes {p}c0… for the steps, {p}d0… for the dots). Every
# name in it starts with its prefix, since it is drawn inside the page. A phone
# keeps /clips a year: a film that changes takes a new name (-v2), here and in
# components/InstallGuide.tsx.
#
#   python social/install-guide/make.py      (writes both, next to this file and into v2/public/clips)
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE
APP_OUT = os.path.join(HERE, "..", "..", "v2", "public", "clips")
os.makedirs(OUT, exist_ok=True)

W, H = 1080, 1920
PURPLE = "#6C47FF"
DEEP = "#4F28C6"
INK = "#14121F"
MUTED = "#6B6880"
SOFT = "#EEE9FF"
BLUE = "#0A84FF"
AR = "'Readex Pro', 'Segoe UI', 'Noto Sans Arabic', Tahoma, Arial, sans-serif"
UI = "-apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Arial, sans-serif"
EASE = "cubic-bezier(.4,0,.2,1)"
SPRING = "cubic-bezier(.34,1.56,.64,1)"

# the phone on the canvas: its screen is drawn in 390 x 844 points, then scaled
SW, SH = 390, 844
SCALE = 1.1
BEZ = 13
PW, PH = SW * SCALE + 2 * BEZ, SH * SCALE + 2 * BEZ
PX, PY = (W - PW) / 2, 292


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def ar(x, y, text, size, weight=400, color=INK, anchor="middle", extra=""):
    a = {"middle": "middle", "right": "start"}[anchor]
    return f'<text x="{x}" y="{y}" direction="rtl" text-anchor="{a}" font-family="{AR}" font-size="{size}" font-weight="{weight}" fill="{color}" {extra}>{esc(text)}</text>'


def lat(x, y, text, size, weight=400, color=INK, anchor="start", family=UI):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{family}" font-size="{size}" font-weight="{weight}" fill="{color}">{esc(text)}</text>'


# ── the animation: keyframes made from (seconds, properties) ───────────────
class Film:
    def __init__(self, length, prefix="", keep=False):
        self.D = length
        self.css = []
        self.n = 0
        self.prefix = prefix
        # the app's films: a phone that asks for less motion still sees how to install (the app's
        # globals.css shortens every animation then; this, more specific and as firm, wins)
        self.keep = " !important" if keep else ""

    def anim(self, frames, origin="50% 50%", name=None):
        """frames: [(t, opacity, transform), …] in seconds; held before the first and after the last."""
        self.n += 1
        name = f"{self.prefix}{name or f'a{self.n}'}"
        pts = sorted(frames)
        if pts[0][0] > 0:
            pts = [(0, pts[0][1], pts[0][2])] + pts
        if pts[-1][0] < self.D:
            pts = pts + [(self.D, pts[-1][1], pts[-1][2])]
        body = []
        for t, op, tr in pts:
            pct = round(100 * t / self.D, 4)
            body.append(f"{pct}% {{opacity:{op};transform:{tr};animation-timing-function:{EASE}}}")
        self.css.append(f"@keyframes {name} {{{' '.join(body)}}}")
        self.css.append(f".{name} {{animation:{name} {self.D}s infinite{self.keep};transform-box:fill-box;transform-origin:{origin}}}")
        return name

    def show(self, t_in, t_out, enter="none", leave="none", dur=0.4, origin="50% 50%", loop_in=False, name=None):
        """visible from t_in to t_out, coming with `enter` and going with `leave` (transforms)"""
        f = []
        if loop_in:  # visible at 0 (the film's first picture), back in at the end of the loop
            f += [(0, 1, "none"), (t_out, 1, "none"), (t_out + dur, 0, leave), (self.D - dur, 0, enter), (self.D, 1, "none")]
        else:
            f += [(0, 0, enter), (t_in, 0, enter), (t_in + dur, 1, "none"), (t_out, 1, "none"), (t_out + dur, 0, leave)]
        return self.anim(f, origin, name)

    def style(self, font=True):
        font = "@import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;600;700&amp;display=swap');\n" if font else ""
        return "<style>" + font + "\n".join(self.css) + "</style>"


DEFS = """
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDE7FF"/><stop offset="0.5" stop-color="#F7F5FF"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
  <radialGradient id="glow" cx="0.85" cy="0.08" r="0.65"><stop offset="0" stop-color="#9B7BFF" stop-opacity="0.35"/><stop offset="1" stop-color="#9B7BFF" stop-opacity="0"/></radialGradient>
  <linearGradient id="pb" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#7244EC"/><stop offset="1" stop-color="#4F28C6"/></linearGradient>
  <linearGradient id="pf" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="#7143E6"/><stop offset="1" stop-color="#5029C5"/></linearGradient>
  <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9B7BFF"/><stop offset="0.55" stop-color="#6C47FF"/><stop offset="1" stop-color="#4A2AD6"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.94"/><stop offset="1" stop-color="#F3F1FA" stop-opacity="0.82"/></linearGradient>
  <linearGradient id="wallI" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#1B2A6B"/><stop offset="0.45" stop-color="#5B3CC4"/><stop offset="1" stop-color="#E86AA6"/></linearGradient>
  <linearGradient id="wallA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E4BD8"/><stop offset="0.5" stop-color="#4E8BE6"/><stop offset="1" stop-color="#3CC6AE"/></linearGradient>
  <mask id="pm"><rect width="96" height="70" fill="#fff"/><rect x="-2" y="14" width="86" height="58" rx="10" fill="#000"/></mask>
  <symbol id="mark" viewBox="0 0 96 70">
    <rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill="url(#pb)" mask="url(#pm)"/>
    <rect x="1" y="17" width="80" height="52" rx="8" fill="url(#pf)"/>
    <path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill="#FFFFFF"/>
  </symbol>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.18"/></filter>
  <filter id="phoneShadow" x="-20%" y="-10%" width="140%" height="125%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#2A1A7A" flood-opacity="0.28"/></filter>
  <clipPath id="screen"><rect x="0" y="0" width="390" height="844" rx="52"/></clipPath>
"""


def app_icon(x, y, s, round_=False, shadow=True):
    r = s / 2 if round_ else s * 0.23
    out = f'<rect x="{x}" y="{y}" width="{s}" height="{s}" rx="{r}" fill="#FFFFFF" {"filter=\"url(#lift)\"" if shadow else ""}/>'
    m = s * 0.64
    out += f'<use href="#mark" x="{x + (s - m) / 2}" y="{y + (s - m * 70 / 96) / 2}" width="{m}" height="{m * 70 / 96}"/>'
    return out


# ── what the screens show ──────────────────────────────────────────────────
def status(dark=False, android=False):
    c = "#FFFFFF" if dark else INK
    out = lat(36 if not android else 26, 34, "9:41", 16, 600, c)
    if android:
        out += f'<circle cx="195" cy="24" r="8" fill="#0B0A10"/>'
    else:
        out += f'<rect x="139" y="12" width="112" height="33" rx="16.5" fill="#0B0A10"/>'
    out += f'<rect x="330" y="23" width="26" height="13" rx="4" fill="none" stroke="{c}" stroke-width="1.6"/><rect x="332.5" y="25.5" width="19" height="8" rx="2" fill="{c}"/>'
    out += "".join(f'<rect x="{298 + i * 6}" y="{36 - (i + 1) * 3.4}" width="4" height="{(i + 1) * 3.4}" rx="1" fill="{c}"/>' for i in range(4))
    return out


def page(top=0):
    # Pointili's page in the browser
    out = f'<rect x="0" y="0" width="390" height="844" fill="#F7F5FF"/>'
    t = 70 + top
    out += f'<rect x="16" y="{t}" width="358" height="226" rx="28" fill="url(#hero)"/>'
    out += f'<rect x="250" y="{t + 18}" width="96" height="96" rx="48" fill="#FFFFFF" fill-opacity="0.10"/>'
    out += f'<use href="#mark" x="36" y="{t + 26}" width="66" height="48"/>'
    out += f'<rect x="36" y="{t + 96}" width="170" height="16" rx="8" fill="#FFFFFF" fill-opacity="0.92"/>'
    out += f'<rect x="36" y="{t + 124}" width="230" height="11" rx="5.5" fill="#FFFFFF" fill-opacity="0.6"/>'
    out += f'<rect x="36" y="{t + 162}" width="138" height="42" rx="21" fill="#FFFFFF"/>'
    out += f'<rect x="62" y="{t + 179}" width="86" height="9" rx="4.5" fill="{PURPLE}" fill-opacity="0.75"/>'
    out += f'<rect x="16" y="{t + 254}" width="190" height="16" rx="8" fill="#DCD6EE"/>'
    for i in range(3):
        y = t + 288 + i * 92
        out += f'<rect x="16" y="{y}" width="358" height="78" rx="20" fill="#FFFFFF"/>'
        out += f'<circle cx="52" cy="{y + 39}" r="20" fill="{SOFT}"/><circle cx="52" cy="{y + 39}" r="8" fill="{PURPLE}" fill-opacity="0.6"/>'
        out += f'<rect x="86" y="{y + 24}" width="{200 - i * 30}" height="11" rx="5.5" fill="#D9D3EC"/>'
        out += f'<rect x="86" y="{y + 44}" width="{150 - i * 20}" height="9" rx="4.5" fill="#E8E4F4"/>'
    return out


def dots(cx, cy, vertical=False, c=INK, r=3.3, gap=8):
    if vertical:
        return "".join(f'<circle cx="{cx}" cy="{cy - gap + i * gap}" r="{r}" fill="{c}"/>' for i in range(3))
    return "".join(f'<circle cx="{cx - gap + i * gap}" cy="{cy}" r="{r}" fill="{c}"/>' for i in range(3))


def share_icon(cx, cy, c=INK, s=1.0, w=2.0):
    return (f'<g transform="translate({cx} {cy}) scale({s})" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M-5 -3 H-8 V10 H8 V-3 H5"/><path d="M0 5 V-12 M-5 -7 L0 -12 L5 -7"/></g>')


def icon(kind, cx, cy, c=INK, w=1.9):
    g = f'fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'
    if kind == "share":
        return share_icon(cx, cy, c, 0.95, w)
    if kind == "star":
        return f'<path d="M{cx} {cy - 9} l2.9 6 6.6.8 -4.9 4.5 1.3 6.5 -5.9 -3.3 -5.9 3.3 1.3 -6.5 -4.9 -4.5 6.6 -.8z" {g}/>'
    if kind == "book":
        return f'<path d="M{cx - 9} {cy - 8} q4.5 -2.5 9 0 q4.5 -2.5 9 0 v16 q-4.5 -2.5 -9 0 q-4.5 -2.5 -9 0 z M{cx} {cy - 8} v16" {g}/>'
    if kind == "glasses":
        return f'<circle cx="{cx - 6}" cy="{cy + 1}" r="4.6" {g}/><circle cx="{cx + 6}" cy="{cy + 1}" r="4.6" {g}/><path d="M{cx - 1.5} {cy} h3" {g}/>'
    if kind == "find":
        return f'<circle cx="{cx - 2}" cy="{cy - 2}" r="6.5" {g}/><path d="M{cx + 3} {cy + 3} l5.5 5.5" {g}/>'
    if kind == "plus":
        return f'<path d="M{cx} {cy - 8} v16 M{cx - 8} {cy} h16" {g}/>'
    if kind == "copy":
        return f'<rect x="{cx - 7}" y="{cy - 5}" width="12" height="14" rx="2.5" {g}/><path d="M{cx - 3} {cy - 9} h9 a2 2 0 0 1 2 2 v10" {g}/>'
    if kind == "addhome":
        return f'<rect x="{cx - 9}" y="{cy - 9}" width="18" height="18" rx="5" {g}/><path d="M{cx} {cy - 4.5} v9 M{cx - 4.5} {cy} h9" {g}/>'
    if kind == "print":
        return f'<path d="M{cx - 6} {cy - 4} v-5 h12 v5 M{cx - 9} {cy - 4} h18 v9 h-3 M{cx - 9} {cy - 4} v9 h3 M{cx - 6} {cy + 2} h12 v7 h-12 z" {g}/>'
    if kind == "dots":
        return dots(cx, cy, c=c, r=2.6, gap=7)
    if kind == "x":
        return f'<path d="M{cx - 6} {cy - 6} l12 12 M{cx + 6} {cy - 6} l-12 12" {g}/>'
    if kind == "back":
        return f'<path d="M{cx + 4} {cy - 9} l-9 9 9 9" fill="none" stroke="{c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
    if kind == "arrow":
        return f'<path d="M{cx - 7} {cy} h14 M{cx + 1} {cy - 6} l6 6 -6 6" {g}/>'
    if kind == "down":
        return f'<path d="M{cx} {cy - 8} v12 M{cx - 5} {cy - 1} l5 5 5 -5 M{cx - 7} {cy + 8} h14" {g}/>'
    if kind == "info":
        return f'<circle cx="{cx}" cy="{cy}" r="8.5" {g}/><path d="M{cx} {cy - 1} v5 M{cx} {cy - 4.5} v.1" {g}/>'
    if kind == "reload":
        return f'<path d="M{cx + 7} {cy - 2} a7.5 7.5 0 1 1 -2.2 -5.3 M{cx + 7} {cy - 9} v6 h-6" {g}/>'
    return ""


# iPhone screens ------------------------------------------------------------
def safari_bar():
    y = 754
    out = f'<rect x="14" y="{y}" width="362" height="60" rx="30" fill="url(#glass)" stroke="#FFFFFF" stroke-width="1.6" filter="url(#lift)"/>'
    out += icon("back", 44, y + 30, INK)
    out += f'<rect x="76" y="{y + 10}" width="238" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.72"/>'
    out += lat(195, y + 36, "pointili.online", 16, 500, INK, "middle")
    out += dots(346, y + 30)
    return out


def home_bar(dark=False):
    return f'<rect x="128" y="830" width="134" height="5" rx="2.5" fill="{"#FFFFFF" if dark else INK}"/>'


IOS_MENU = [("Partager", "share"), ("Ajouter aux favoris", "star"), ("Ajouter un signet", "book"), ("Liste de lecture", "glasses"), ("Rechercher dans la page", "find"), ("Nouvel onglet", "plus")]


def ios_menu(hl):
    x, y, w = 112, 382, 262
    h = 16 + 54 * len(IOS_MENU)
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="30" fill="url(#glass)" stroke="#FFFFFF" stroke-width="1.6" filter="url(#lift)"/>'
    for i, (label, ic) in enumerate(IOS_MENU):
        iy = y + 8 + i * 54
        if i == 0:
            out += f'<rect class="{hl}" x="{x + 8}" y="{iy + 3}" width="{w - 16}" height="48" rx="18" fill="{PURPLE}" fill-opacity="0.14"/>'
        if i in (1, 4):
            out += f'<line x1="{x + 22}" x2="{x + w - 22}" y1="{iy}" y2="{iy}" stroke="#DCD8E6" stroke-width="1"/>'
        out += lat(x + 22, iy + 33, label, 16, 600 if i == 0 else 500, INK)
        out += icon(ic, x + w - 32, iy + 27, INK)
    return out


def share_sheet(hl):
    y = 318
    out = f'<rect x="0" y="{y}" width="390" height="600" rx="40" fill="#F2F1F7"/>'
    out += f'<rect x="175" y="{y + 10}" width="40" height="5" rx="2.5" fill="#C9C6D3"/>'
    out += app_icon(22, y + 32, 54)
    out += lat(90, y + 54, "Pointili", 18, 700, INK)
    out += lat(90, y + 77, "pointili.online", 14, 400, MUTED)
    out += f'<circle cx="352" cy="{y + 59}" r="18" fill="#E3E1EA"/>' + icon("x", 352, y + 59, MUTED, 2.2)
    out += f'<line x1="20" x2="370" y1="{y + 110}" y2="{y + 110}" stroke="#E2E0E8"/>'
    names = [("AirDrop", "#1E9BF0"), ("Messages", "#34C759"), ("Mail", "#2F80ED"), ("WhatsApp", "#25D366"), ("Notes", "#FFCC00")]
    for i, (n, c) in enumerate(names):
        cx = 50 + i * 72
        out += f'<circle cx="{cx}" cy="{y + 156}" r="29" fill="{c}"/>'
        out += lat(cx, y + 206, n, 11.5, 500, MUTED, "middle")
    # the actions, in a row; the last («…») shows them all
    acts = [("Copier", "copy"), ("Signet", "book"), ("Lecture", "glasses"), ("Plus", "dots")]
    for i, (n, ic) in enumerate(acts):
        x = 26 + i * 90
        last = i == len(acts) - 1
        out += f'<rect x="{x}" y="{y + 238}" width="66" height="66" rx="20" fill="#FFFFFF"/>'
        if last:
            out += f'<rect class="{hl}" x="{x}" y="{y + 238}" width="66" height="66" rx="20" fill="{PURPLE}" fill-opacity="0.16"/>'
        out += icon(ic, x + 33, y + 271, INK, 2.1)
        out += lat(x + 33, y + 326, n, 12.5, 600 if last else 500, INK if last else MUTED, "middle")
    out += f'<rect x="16" y="{y + 352}" width="358" height="150" rx="22" fill="#FFFFFF"/>'
    for i in range(3):
        out += f'<rect x="34" y="{y + 378 + i * 46}" width="{180 - i * 25}" height="11" rx="5.5" fill="#E2DFEA"/>'
    return out


IOS_ALL = [("Copier", "copy"), ("Ajouter à la liste de lecture", "glasses"), ("Ajouter un signet", "book"), ("Ajouter aux favoris", "star"), ("Rechercher dans la page", "find"), ("Ajouter à l’écran d’accueil", "addhome"), ("Imprimer", "print")]


def all_actions(hl):
    y = 96
    out = f'<rect x="0" y="{y}" width="390" height="800" rx="40" fill="#F2F1F7"/>'
    out += f'<rect x="175" y="{y + 10}" width="40" height="5" rx="2.5" fill="#C9C6D3"/>'
    out += lat(195, y + 56, "Pointili", 17, 700, INK, "middle")
    gy = y + 84
    out += f'<rect x="16" y="{gy}" width="358" height="{len(IOS_ALL) * 56}" rx="22" fill="#FFFFFF"/>'
    for i, (n, ic) in enumerate(IOS_ALL):
        ry = gy + i * 56
        target = ic == "addhome"
        if i:
            out += f'<line x1="34" x2="374" y1="{ry}" y2="{ry}" stroke="#ECEAF1"/>'
        if target:
            out += f'<rect class="{hl}" x="20" y="{ry + 4}" width="350" height="48" rx="16" fill="{PURPLE}" fill-opacity="0.14"/>'
        out += lat(34, ry + 35, n, 16, 700 if target else 500, INK)
        out += icon(ic, 346, ry + 28, INK)
    return out


def add_screen(hl):
    y = 54
    out = f'<rect x="0" y="{y}" width="390" height="820" rx="40" fill="#F2F1F7"/>'
    out += f'<circle cx="40" cy="{y + 46}" r="21" fill="url(#glass)" stroke="#FFFFFF" stroke-width="1.4" filter="url(#lift)"/>' + icon("x", 40, y + 46, INK, 2.2)
    out += lat(178, y + 52, "Écran d’accueil", 15, 700, INK, "middle")
    out += f'<rect x="282" y="{y + 27}" width="92" height="38" rx="19" fill="{BLUE}"/>'
    out += f'<rect class="{hl}" x="282" y="{y + 27}" width="92" height="38" rx="19" fill="#FFFFFF" fill-opacity="0.35"/>'
    out += lat(328, y + 52, "Ajouter", 15.5, 700, "#FFFFFF", "middle")
    cy = y + 92
    out += f'<rect x="16" y="{cy}" width="358" height="114" rx="24" fill="#FFFFFF"/>'
    out += app_icon(32, cy + 17, 80)
    out += lat(130, cy + 48, "Pointili", 20, 700, INK)
    out += f'<line x1="130" x2="358" y1="{cy + 62}" y2="{cy + 62}" stroke="#ECEAF1"/>'
    out += lat(130, cy + 88, "pointili.online", 14, 400, MUTED)
    ty = cy + 130
    out += f'<rect x="16" y="{ty}" width="358" height="62" rx="24" fill="#FFFFFF"/>'
    out += lat(34, ty + 37, "Ouvrir comme app web", 16, 600, INK)
    out += f'<rect x="304" y="{ty + 16}" width="54" height="30" rx="15" fill="#34C759"/><circle cx="343" cy="{ty + 31}" r="12.5" fill="#FFFFFF"/>'
    for i in range(3):
        out += f'<rect x="34" y="{ty + 90 + i * 22}" width="{300 - i * 60}" height="10" rx="5" fill="#DDDAE6"/>'
    return out


def ios_home(pop):
    out = f'<rect x="0" y="0" width="390" height="844" fill="url(#wallI)"/>' + status(dark=True)
    out += f'<circle cx="320" cy="140" r="120" fill="#FFFFFF" fill-opacity="0.06"/><circle cx="60" cy="620" r="160" fill="#FFFFFF" fill-opacity="0.05"/>'
    for i in range(12):
        col, row = i % 4, i // 4
        x, y = 30 + col * 88, 90 + row * 104
        if (col, row) == (1, 2):
            out += f'<g class="{pop}">{app_icon(x, y, 66, shadow=True)}' + lat(x + 33, y + 88, "Pointili", 13, 600, "#FFFFFF", "middle") + "</g>"
            continue
        out += f'<rect x="{x}" y="{y}" width="66" height="66" rx="16" fill="#FFFFFF" fill-opacity="0.22" stroke="#FFFFFF" stroke-opacity="0.35"/>'
        out += f'<rect x="{x + 13}" y="{y + 80}" width="40" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.45"/>'
    out += f'<rect x="150" y="686" width="90" height="30" rx="15" fill="#FFFFFF" fill-opacity="0.25"/>'
    out += lat(195, 706, "Rechercher", 12, 600, "#FFFFFF", "middle")
    out += f'<rect x="14" y="728" width="362" height="92" rx="36" fill="#FFFFFF" fill-opacity="0.22" stroke="#FFFFFF" stroke-opacity="0.4"/>'
    for i in range(4):
        out += f'<rect x="{34 + i * 88}" y="{741}" width="66" height="66" rx="16" fill="#FFFFFF" fill-opacity="0.32"/>'
    return out + home_bar(dark=True)


# Android screens -----------------------------------------------------------
def chrome_bar():
    out = f'<rect x="0" y="0" width="390" height="112" fill="#FFFFFF"/>'
    out += f'<rect x="12" y="56" width="292" height="46" rx="23" fill="#EFEDF5"/>'
    out += f'<circle cx="38" cy="79" r="8" fill="none" stroke="{MUTED}" stroke-width="1.8"/><path d="M34 79 h8" stroke="{MUTED}" stroke-width="1.8"/>'
    out += lat(58, 85, "pointili.online", 16, 500, INK)
    out += f'<rect x="318" y="68" width="22" height="22" rx="5" fill="none" stroke="{INK}" stroke-width="2"/>' + lat(329, 84, "1", 12, 700, INK, "middle")
    out += dots(366, 79, vertical=True)
    return out


AND_MENU = ["Nouvel onglet", "Nouvel onglet privé", "Historique", "Téléchargements", "Favoris", "Onglets récents", "Ajouter à l’écran d’accueil", "Paramètres"]


def chrome_menu(hl):
    x, y, w = 140, 52, 240
    h = 70 + 50 * len(AND_MENU)
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="#FFFFFF" filter="url(#lift)"/>'
    for i, k in enumerate(("arrow", "star", "down", "info", "reload")):
        out += icon(k, x + 28 + i * (w - 56) / 4, y + 34, MUTED, 2)
    out += f'<line x1="{x}" x2="{x + w}" y1="{y + 62}" y2="{y + 62}" stroke="#ECEAF1"/>'
    for i, n in enumerate(AND_MENU):
        iy = y + 66 + i * 50
        target = i == 6
        if target:
            out += f'<rect class="{hl}" x="{x + 6}" y="{iy + 2}" width="{w - 12}" height="46" rx="14" fill="{PURPLE}" fill-opacity="0.14"/>'
        out += lat(x + 22, iy + 31, n, 14.5 if target else 15, 700 if target else 500, INK)
    return out


def install_dialog(hl):
    x, y, w, h = 26, 286, 338, 260
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="30" fill="#FFFFFF" filter="url(#lift)"/>'
    out += lat(x + 26, y + 50, "Installer l’application", 21, 600, INK)
    out += app_icon(x + 26, y + 78, 64, round_=True)
    out += lat(x + 108, y + 104, "Pointili", 18, 700, INK)
    out += lat(x + 108, y + 128, "pointili.online", 14, 400, MUTED)
    out += lat(x + 168, y + 222, "Annuler", 15.5, 600, "#0B57D0", "middle")
    out += f'<rect x="{x + 214}" y="{y + 194}" width="100" height="44" rx="22" fill="#0B57D0"/>'
    out += f'<rect class="{hl}" x="{x + 214}" y="{y + 194}" width="100" height="44" rx="22" fill="#FFFFFF" fill-opacity="0.32"/>'
    out += lat(x + 264, y + 222, "Installer", 15.5, 700, "#FFFFFF", "middle")
    return out


def android_home(pop):
    out = f'<rect x="0" y="0" width="390" height="844" fill="url(#wallA)"/>' + status(dark=True, android=True)
    out += lat(36, 150, "9:41", 64, 300, "#FFFFFF")
    out += lat(38, 182, "ven. 24 oct.", 16, 500, "#FFFFFF")
    for i in range(8):
        col, row = i % 4, i // 4
        x, y = 34 + col * 86, 470 + row * 108
        if (col, row) == (2, 1):
            out += f'<g class="{pop}">{app_icon(x, y, 62, round_=True)}' + lat(x + 31, y + 84, "Pointili", 13, 600, "#FFFFFF", "middle") + "</g>"
            continue
        out += f'<circle cx="{x + 31}" cy="{y + 31}" r="31" fill="#FFFFFF" fill-opacity="0.28"/>'
        out += f'<rect x="{x + 11}" y="{y + 76}" width="40" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.5"/>'
    out += f'<rect x="16" y="726" width="358" height="56" rx="28" fill="#FFFFFF" fill-opacity="0.92"/>'
    out += f'<circle cx="44" cy="754" r="13" fill="none" stroke="#4285F4" stroke-width="3"/>'
    out += f'<rect x="70" y="749" width="120" height="10" rx="5" fill="#C9C6D3"/>'
    out += f'<rect x="150" y="814" width="90" height="5" rx="2.5" fill="#FFFFFF"/>'
    return out


# ── the film ───────────────────────────────────────────────────────────────
def finger(film, x, y, t_tap):
    """a fingertip that comes to (x, y), presses at t_tap, and leaves a ripple"""
    come = film.anim([(0, 0, "translate(70px,110px) scale(1.2)"), (t_tap - 1.3, 0, "translate(70px,110px) scale(1.2)"), (t_tap - 0.75, 1, "translate(0,0) scale(1)"),
                      (t_tap - 0.12, 1, "translate(0,0) scale(1)"), (t_tap, 1, "translate(0,0) scale(.82)"), (t_tap + 0.22, 1, "translate(0,0) scale(1)"),
                      (t_tap + 0.55, 0, "translate(0,0) scale(1)")])
    ripple = film.anim([(0, 0, "scale(.6)"), (t_tap - 0.02, 0, "scale(.6)"), (t_tap + 0.02, 0.7, "scale(.6)"), (t_tap + 0.6, 0, "scale(2.4)")])
    return (f'<g transform="translate({x} {y})"><g class="{ripple}"><circle r="26" fill="none" stroke="{PURPLE}" stroke-width="4"/></g>'
            f'<g class="{come}"><circle r="30" fill="{PURPLE}" fill-opacity="0.16" stroke="{PURPLE}" stroke-width="3.5"/><circle r="6" fill="{PURPLE}" fill-opacity="0.85"/></g></g>')


def flash(film, t_tap):
    """a pressed item: lit for a moment when tapped"""
    return film.anim([(0, 0, "none"), (t_tap - 0.05, 0, "none"), (t_tap + 0.05, 1, "none"), (t_tap + 0.5, 1, "none"), (t_tap + 0.8, 0.4, "none")])


def caption(film, k, t_in, t_out, title, chip, hint, n_label):
    cls = film.show(t_in, t_out, "translate(0,26px)", "translate(0,-18px)", 0.45)
    cy = 1338
    out = f'<g class="{cls}">'
    out += f'<circle cx="540" cy="{cy}" r="36" fill="{PURPLE}"/>' + lat(540, cy + 13, n_label, 36, 700, "#FFFFFF", "middle", AR)
    out += ar(540, cy + 104, title, 52, 700, INK)
    if chip:
        w = max(110, len(chip) * 19 + 60)
        out += f'<rect x="{540 - w / 2}" y="{cy + 134}" width="{w}" height="70" rx="35" fill="{SOFT}" stroke="#D9CFFF" stroke-width="2"/>'
        out += lat(540, cy + 182, chip, 34, 700, DEEP, "middle", AR)
    out += ar(540, cy + 266, hint, 32, 400, MUTED)
    return out + "</g>"


def progress(film, spans):
    n = len(spans)
    out = ""
    gap = 34
    x0 = 540 - (n - 1) * gap / 2
    for i, (a, b) in enumerate(spans):
        on = film.anim([(0, 0, "none"), (a, 0, "none"), (a + 0.3, 1, "none"), (b, 1, "none"), (b + 0.3, 0, "none")])
        x = x0 + i * gap
        out += f'<circle cx="{x}" cy="1700" r="7" fill="#D7D0F0"/>'
        out += f'<g class="{on}"><rect x="{x - 15}" y="1693" width="30" height="14" rx="7" fill="{PURPLE}"/></g>'
    return out


def film_svg(name, platform, D, layers, taps, captions, spans):
    film = Film(D)
    screen = []
    for build in layers:
        screen.append(build(film))
    for x, y, t in taps:
        screen.append(finger(film, x, y, t))
    caps = [caption(film, *c) for c in captions]
    prog = progress(film, spans)
    s = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
    s += f"<defs>{DEFS}</defs>"
    body = [f'<rect width="{W}" height="{H}" fill="url(#bg)"/><rect width="{W}" height="{H}" fill="url(#glow)"/>']
    body.append(f'<use href="#mark" x="{W / 2 - 124}" y="64" width="70" height="51"/>')
    body.append(lat(W / 2 - 40, 104, "Pointili", 44, 700, INK, "start", AR))
    body.append(ar(W / 2, 200, "حطّ Pointili في تليفونك", 62, 700, INK))
    body.append(f'<rect x="{W / 2 - 160}" y="226" width="320" height="52" rx="26" fill="{PURPLE}"/>')
    body.append(ar(W / 2, 262, platform, 28, 700, "#FFFFFF"))
    body.append(f'<rect x="{PX}" y="{PY}" width="{PW}" height="{PH}" rx="{52 * SCALE + BEZ}" fill="#15131E" filter="url(#phoneShadow)"/>')
    body.append(f'<rect x="{PX + 3}" y="{PY + 3}" width="{PW - 6}" height="{PH - 6}" rx="{52 * SCALE + BEZ - 3}" fill="none" stroke="#3A3746" stroke-width="2"/>')
    body.append(f'<g transform="translate({PX + BEZ} {PY + BEZ}) scale({SCALE})"><g clip-path="url(#screen)">' + "".join(screen) + "</g></g>")
    body += caps
    body.append(prog)
    body.append(lat(W / 2, 1860, "pointili.online", 26, 600, MUTED, "middle", AR))
    s += film.style() + "".join(body) + "</svg>"
    io.open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n").write(s)


def film_app(name, prefix, D, layers, taps, captions, spans):
    film = Film(D, prefix, keep=True)
    screen = [build(film) for build in layers] + [finger(film, x, y, t) for x, y, t in taps]
    # the steps' words and the dots, drawn by the app: only their timing is here
    for k, t_in, t_out, *_ in captions:
        film.show(t_in, t_out, "translate(0,10px)", "translate(0,-8px)", 0.45, name=f"c{k}")
    for i, (a, b) in enumerate(spans):
        film.anim([(0, 0, "none"), (a, 0, "none"), (a + 0.3, 1, "none"), (b, 1, "none"), (b + 0.3, 0, "none")], name=f"d{i}")
    pad = 4
    box = f"{PX - pad} {PY - pad} {PW + 2 * pad} {PH + 2 * pad}"
    # a lighter shadow (the menus move over it, and it is painted again each time), no page behind the phone
    defs = DEFS.replace('dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.18"', 'dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.16"')
    defs = re.sub(r'\s*<(linear|radial)Gradient id="(bg|glow)".*?</\1Gradient>', "", defs)
    defs = re.sub(r'\s*<filter id="phoneShadow".*?</filter>', "", defs)
    out = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    out += f"<defs>{defs}</defs>" + film.style(font=False)
    out += f'<rect x="{PX}" y="{PY}" width="{PW}" height="{PH}" rx="{52 * SCALE + BEZ}" fill="#15131E"/>'
    out += f'<rect x="{PX + 3}" y="{PY + 3}" width="{PW - 6}" height="{PH - 6}" rx="{52 * SCALE + BEZ - 3}" fill="none" stroke="#3A3746" stroke-width="2"/>'
    out += f'<g transform="translate({PX + BEZ} {PY + BEZ}) scale({SCALE})"><g clip-path="url(#screen)">' + "".join(screen) + "</g></g></svg>"
    # every id prefixed, and what points at it; the numbers cut to two decimals; no line breaks
    out = re.sub(r'id="([\w-]+)"', lambda m: f'id="{prefix}{m.group(1)}"', out)
    out = re.sub(r"url\(#([\w-]+)\)", lambda m: f"url(#{prefix}{m.group(1)})", out)
    out = re.sub(r'href="#([\w-]+)"', lambda m: f'href="#{prefix}{m.group(1)}"', out)
    out = re.sub(r"(\d+\.\d{3,})", lambda m: f"{float(m.group(1)):.2f}".rstrip("0").rstrip("."), out)
    out = re.sub(r"\n\s*", "", out)
    os.makedirs(APP_OUT, exist_ok=True)
    io.open(os.path.join(APP_OUT, name), "w", encoding="utf-8", newline="\n").write(out)


# iPhone: ⋯ → Partager → «…» (plus d'options) → Ajouter à l'écran d'accueil → Ajouter → on the screen
def ios_film():
    D = 27.0
    T = [3.0, 7.0, 11.0, 15.0, 19.0]  # the five taps

    def safari(f):
        cls = f.show(0, 19.4, leave="none", dur=0.45, loop_in=True)
        return f'<g class="{cls}">{page()}{status()}{safari_bar()}{home_bar()}</g>'

    def dim(f):
        cls = f.anim([(0, 0, "none"), (T[0] + 0.2, 0, "none"), (T[0] + 0.5, 1, "none"), (19.4, 1, "none"), (19.8, 0, "none")])
        return f'<rect class="{cls}" x="0" y="0" width="390" height="844" fill="#14121F" fill-opacity="0.32"/>'

    def menu(f):
        hl = flash(f, T[1])
        cls = f.show(T[0] + 0.15, T[1] + 0.45, "scale(.25)", "scale(.9)", 0.38, origin="95% 100%")
        return f'<g class="{cls}">{ios_menu(hl)}</g>'

    def sheet(f):
        hl = flash(f, T[2])
        cls = f.show(T[1] + 0.5, T[2] + 0.5, "translate(0,560px)", "translate(0,-30px)", 0.5)
        return f'<g class="{cls}">{share_sheet(hl)}</g>'

    def allacts(f):
        hl = flash(f, T[3])
        cls = f.show(T[2] + 0.45, T[3] + 0.5, "translate(0,240px)", "translate(0,40px)", 0.5)
        return f'<g class="{cls}">{all_actions(hl)}</g>'

    def add(f):
        hl = flash(f, T[4])
        cls = f.show(T[3] + 0.5, T[4] + 0.45, "translate(0,800px)", "translate(0,0) scale(.96)", 0.55)
        return f'<g class="{cls}">{add_screen(hl)}</g>'

    def home(f):
        pop = f.anim([(0, 0, "scale(0)"), (T[4] + 1.1, 0, "scale(0)"), (T[4] + 1.6, 1, "scale(1.12)"), (T[4] + 1.9, 1, "scale(1)"), (D - 0.45, 1, "scale(1)"), (D, 0, "scale(1)")])
        cls = f.anim([(0, 0, "none"), (T[4] + 0.4, 0, "none"), (T[4] + 0.85, 1, "none"), (D - 0.45, 1, "none"), (D, 0, "none")])
        return f'<g class="{cls}">{ios_home(pop)}</g>'

    taps = [(346, 784, T[0]), (243, 417, T[1]), (329, 589, T[2]), (195, 488, T[3]), (328, 100, T[4])]
    caps = [
        (0, 0.0, T[0] + 0.55, "اضغط على الزرّ ⋯", "⋯", "في البار اللوطا، على اليمين", "1"),
        (1, T[0] + 0.7, T[1] + 0.55, "اختار «Partager»", "Partager", "ولا «Share»", "2"),
        (2, T[1] + 0.7, T[2] + 0.55, "اضغط على «…»", "Plus d’options", "الزرّ اللي على اليمين، يورّيك الكل", "3"),
        (3, T[2] + 0.7, T[3] + 0.55, "اختار", "Ajouter à l’écran d’accueil", "ولا «Add to Home Screen»", "4"),
        (4, T[3] + 0.7, T[4] + 0.55, "اضغط «Ajouter»", "Ajouter", "خلّي «Ouvrir comme app web» مشعولة", "5"),
        (5, T[4] + 0.9, D - 0.5, "وهاي Pointili على الشاشة", None, "تحلّها كيما أي أبليكاسيون", "✓"),
    ]
    spans = [(0, T[0] + 0.5), (T[0] + 0.7, T[1] + 0.5), (T[1] + 0.7, T[2] + 0.5), (T[2] + 0.7, T[3] + 0.5), (T[3] + 0.7, T[4] + 0.5), (T[4] + 0.9, D - 0.5)]
    film_svg("install-iphone.svg", "آيفون · Safari", D, [safari, dim, menu, sheet, allacts, add, home], taps, caps, spans)
    film_app("install-ios-v1.svg", "igi-", D, [safari, dim, menu, sheet, allacts, add, home], taps, caps, spans)


# Android: ⋮ → Ajouter à l'écran d'accueil → Installer → on the screen
def android_film():
    D = 18.0
    T = [3.0, 7.0, 11.0]

    def chrome(f):
        cls = f.show(0, 11.4, dur=0.45, loop_in=True)
        return f'<g class="{cls}">{page(top=44)}{chrome_bar()}{status(android=True)}</g>'

    def dim(f):
        cls = f.anim([(0, 0, "none"), (T[0] + 0.2, 0, "none"), (T[0] + 0.45, 0.35, "none"), (T[1] + 0.4, 0.35, "none"), (T[1] + 0.7, 1, "none"), (11.4, 1, "none"), (11.8, 0, "none")])
        return f'<rect class="{cls}" x="0" y="0" width="390" height="844" fill="#14121F" fill-opacity="0.38"/>'

    def menu(f):
        hl = flash(f, T[1])
        cls = f.show(T[0] + 0.15, T[1] + 0.45, "scale(.2)", "scale(.92)", 0.35, origin="100% 0%")
        return f'<g class="{cls}">{chrome_menu(hl)}</g>'

    def dialog(f):
        hl = flash(f, T[2])
        cls = f.show(T[1] + 0.55, T[2] + 0.45, "scale(.85)", "scale(.95)", 0.4)
        return f'<g class="{cls}">{install_dialog(hl)}</g>'

    def home(f):
        pop = f.anim([(0, 0, "scale(0)"), (T[2] + 1.1, 0, "scale(0)"), (T[2] + 1.6, 1, "scale(1.14)"), (T[2] + 1.9, 1, "scale(1)"), (D - 0.45, 1, "scale(1)"), (D, 0, "scale(1)")])
        cls = f.anim([(0, 0, "none"), (T[2] + 0.4, 0, "none"), (T[2] + 0.85, 1, "none"), (D - 0.45, 1, "none"), (D, 0, "none")])
        return f'<g class="{cls}">{android_home(pop)}</g>'

    taps = [(366, 79, T[0]), (260, 443, T[1]), (290, 502, T[2])]
    caps = [
        (0, 0.0, T[0] + 0.55, "اضغط على الزرّ ⋮", "⋮", "الفوق، على اليمين متاع Chrome", "1"),
        (1, T[0] + 0.7, T[1] + 0.55, "اختار", "Ajouter à l’écran d’accueil", "ولا «Installer l’application»", "2"),
        (2, T[1] + 0.7, T[2] + 0.55, "اضغط «Installer»", "Installer", "وتتحطّ وحدها في التليفون", "3"),
        (3, T[2] + 0.9, D - 0.5, "وهاي Pointili على الشاشة", None, "تحلّها كيما أي أبليكاسيون", "✓"),
    ]
    spans = [(0, T[0] + 0.5), (T[0] + 0.7, T[1] + 0.5), (T[1] + 0.7, T[2] + 0.5), (T[2] + 0.9, D - 0.5)]
    film_svg("install-android.svg", "أندرويد · Chrome", D, [chrome, dim, menu, dialog, home], taps, caps, spans)
    film_app("install-android-v1.svg", "iga-", D, [chrome, dim, menu, dialog, home], taps, caps, spans)


ios_film()
android_film()
print("ok")
