# Pointili — video ads

Fifteen vertical ads (1080×1920, 30 fps, sound at −14 LUFS), 28 seconds to a minute long. The first
five are each built like a reel that worked for someone else — its story, its pace, its kind of
ending — but in Pointili's words, Pointili's look, and only what Pointili really does.

| film | built like | what it says |
|---|---|---|
| `f1-zouz-qhawi` | Daayem's two-cafés story | same street, same coffee: one café has a system — Pointili |
| `f2-hajjam` | QuickStamp's barber reel | the regular who vanished; the card in his phone; a gift tampon on WhatsApp |
| `f3-reply` | menuos's «reply to a comment» | «must my customer download an app?» — no: scan, an account, the tampon |
| `f4-fikra` | forsa's «idea for your business» | a simple loyalty card brings them back — keep the gift reachable |
| `f5-kartouna` | Ayyatli's café-chaos comic | the paper card's chaos, then the calm: code, phone, every tampon on record |

The ten after them (8 Nov 2026) each show one thing the app really does, in a format of its own:

| film | format | what it says |
|---|---|---|
| `f6-hsab` | the math, numbers on a dark board | 200 customers, each back once more a month: 2,400 more coffees a year (an «if», said so) |
| `f7-roulette` | a wheel under stadium lights | a full card earns a spin; the owner picks the gifts and each one's chance; the code at the counter |
| `f8-online` | an Instagram shop | after each order a tampon link on WhatsApp; it works once, never expires, the shop sees who took it |
| `f9-kod` | a little noir | a photographed code is useless: it changes by itself and works once; every tampon is logged |
| `f10-dqiqtin` | a stopwatch race | the card made in two minutes from the phone: name, gift, tampons, colour, logo — then the code |
| `f11-thletha` | trading cards | the regular, the drifting one, the lost one: the app sorts them; a gift tampon brings one back |
| `f12-3addad` | a countdown | the reset clock, off until the owner turns it on: 15 days without a tampon and the card restarts; pause it for Ramadan |
| `f13-logo` | quick cuts, one word at a time | the card in your colour, your logo on every tampon, in every customer's phone |
| `f14-kol-mahal` | a photo tour of the trades | not only cafés: barber, pastry, perfume, beauty, greengrocer, fishmonger — each its card and gift |
| `f15-maghaza` | an arcade | tampons as money: the customer buys from the shop's store and shows the code at the till |

The finished films are in `out/`. What each one says is in `SCRIPTS.md`.

One explainer is made with the same engine: `apk-install` (`node render.mjs apk`, copied to
`../explainers/install-apk.mp4`) shows an owner how to put the Android app on a phone. It goes
from `pointili.online/android` through what a phone in French asks: «Télécharger quand même»,
«Ouvrir», «Paramètres» → «Autoriser cette source» (only the first time), «Installer». Then
Pointili opens and its icon is on the home screen. The camera moves in on each button, there's
no voice, and Derja captions explain each step.

## Making them

```
npm install
node render.mjs f2                 # the film → out/f2-hajjam.mp4
node render.mjs f2 --sheet         # a frame a second on one page (.cache/f2-hajjam/sheet.jpg)
node render.mjs f2 --still 3,12.5  # stills at those seconds
node take.mjs f2 "2.wav"           # a recorded voice, kept whole: when each line and word is said in it
node retime.mjs f2                 # the film's scenes, moved to that voice (then render again)
node capture.mjs live-join=/join   # a real screen of the live site, phone-sized, into assets/screens
node scripts.mjs                   # SCRIPTS.md, from the films
```

- **Scenes** are HTML, moved by one GSAP timeline (`engine/kit.js`), filmed frame by frame in
  Chrome by a few pages at once — any frame comes out the same every time.
- **Timing** comes from the voice (`engine/timing.mjs`): `voice/<film>/take.wav` is the take as it
  was said, `take.json` when each line and each word is said in it. A scene is placed in a line
  (`at("a3", 0.4)`: 0.4 s into it) or on one of its words (`at("a3", "الكود")`); the subtitles
  that show a word at a time show each one as it is said; the end card types its keyword when the
  voice says «اكتب». With no voice, a line lasts as long as it takes to say it.
- **Sound** is all made in `engine/sound.mjs`: the music is written and played in code (nothing
  to license), the effects too; the voice leads, the music ducks under it.
- **Screens** in the phones are real screens of the app (`assets/screens`), never drawings of
  them — except the «يبعدو» list and the WhatsApp chat, drawn with the app's own words.
- **Pictures** made elsewhere (ChatGPT) go in `assets/gpt/`; `f4` takes one per scene
  (`f4-w1.jpg` … `f4-w14.jpg`) in place of its drawing, `f14` one per trade (`f14-barber.jpg` …).
  All eleven were made by ChatGPT from `assets/gpt/PROMPTS.md` (originals in `originals/`, not in git).

## The voices

Each film's voice is a person reading its lines in Derja, recorded in one go (`1.wav` … `15.wav`,
14 Nov 2026; the recordings themselves are not in git — `voice/<film>/take.wav` is the voice as
the film plays it). To put a take on its film:

```
node take.mjs f6 "C:/…/6.wav" --check   # what it hears: each line, the pause after it, the words it did not find
node take.mjs f6 "C:/…/6.wav"           # → voice/f6-hsab/take.wav + take.json
node retime.mjs f6                      # the scenes follow the new voice
node render.mjs f6 --sheet --step 0.5   # look at it, then: node render.mjs f6
```

- **The take is kept whole.** Somebody reading in one breath does not stop at every line: cut
  there and the voice stutters. `take.mjs` only finds *when* each line and each word is said
  (Whisper, on this computer: `pip install faster-whisper`), cleans the voice once (rumble off, a
  light compressor, −16 LUFS), cuts its silent ends and shortens a pause longer than 0.6 s.
- **The lines are written the way they are said.** A reader changes words — «خدّم» for «شعّل»,
  «ولا كادو كبير» — and the subtitle must show what is heard: the film's line changes, not the
  voice. `relisten.py` hears a stretch again by itself; `which.py` tells two wordings apart
  («تليفونو» or «تليفونك»?).
- **A phrase said twice is cut** in `voice/<film>/edit.json` (`{ "cut": [[from, to, "why"]] }`,
  seconds in the recording): f13 and f14 have one.
- **A scene that needs time gets a `hold`** on its line (`{ id, say, hold: 0.4 }`): the pause after
  it is made at least that long — in the quiet, where nothing is heard of it.
- **The scenes follow.** `voice/<film>/drawn.json` keeps the voice the scenes were timed for;
  `retime.mjs` carries every `at("line", 0.8)` to the same word in the new take and rewrites the
  number in the film's file. `render.mjs` says so when a film's voice is not the one it was timed for.

A film with no take can still have a studio voice, a wav per line: `node tts.mjs f1` prints what
to paste on openai.fm, then `node voice.mjs f1 <the mp3>` cuts it into `voice/<film>/<line>.wav`.

When posting: the voices are human. The photos in f4 and f14 are AI-made — Instagram asks for its
«AI info» label on realistic AI pictures: tick it for those two in the post's advanced settings.

## Rules the films keep

- No notification is promised, anywhere: the customer sees his card; the owner writes to him.
- A film ends on «جرّب Pointili» — never «بلاش» about Pointili itself (a customer's gift, «قهوة
  بلاش», is another thing). No price is said in a film: prices change (since 7 Nov 2026: 35 د a
  month, 120 for six months, 180 a year) and a film stays up for months.
- A sign-up is a name, a phone number and a password («بالنومرو متاعك برك» — no e-mail).
- The counter's code changes by itself and works once («الكود يتبدّل وحدو، ويخدم مرّة برك»).
