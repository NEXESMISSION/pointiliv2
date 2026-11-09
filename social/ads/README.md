# Pointili — video ads

Five vertical ads (1080×1920, 30 fps, sound at −14 LUFS), each built like a reel that worked for
someone else — its story, its pace, its kind of ending — but in Pointili's words, Pointili's look,
and only what Pointili really does.

| film | built like | what it says |
|---|---|---|
| `f1-zouz-qhawi` | Daayem's two-cafés story | same street, same coffee: one café has a system — Pointili |
| `f2-hajjam` | QuickStamp's barber reel | the regular who vanished; the card in his phone; a gift tampon on WhatsApp |
| `f3-reply` | menuos's «reply to a comment» | «must my customer download an app?» — no: scan, an account, the tampon |
| `f4-fikra` | forsa's «idea for your business» | a simple loyalty card brings them back — keep the gift reachable |
| `f5-kartouna` | Ayyatli's café-chaos comic | the paper card's chaos, then the calm: code, phone, every tampon on record |

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
node voice.mjs f2 "take.m4a"       # a recorded voice, cut into the film's lines (then render again)
node capture.mjs live-join=/join   # a real screen of the live site, phone-sized, into assets/screens
node scripts.mjs                   # SCRIPTS.md, from the films
```

- **Scenes** are HTML, moved by one GSAP timeline (`engine/kit.js`), filmed frame by frame in
  Chrome by a few pages at once — any frame comes out the same every time.
- **Timing** comes from the lines: each lasts as long as its voice (`voice/<film>/<line>.wav`)
  or, with none, as long as it takes to say it. Record a voice and everything re-times to it.
- **Sound** is all made in `engine/sound.mjs`: the music is written and played in code (nothing
  to license), the effects too; the voice leads, the music ducks under it.
- **Screens** in the phones are real screens of the app (`assets/screens`), never drawings of
  them — except the «يبعدو» list and the WhatsApp chat, drawn with the app's own words.
- **Pictures** made elsewhere (ChatGPT) go in `assets/gpt/`; `f4` already takes one per scene
  (`f4-w1.jpg`, `f4-w3.jpg`, `f4-w5.jpg`, `f4-w9.jpg`, `f4-w14.jpg`) in place of its drawing.

## Rules the films keep

- No notification is promised, anywhere: the customer sees his card; the owner writes to him.
- The offer is the trial: «جرّب Pointili بلاش». No price is said in a film: prices change
  (since 7 Nov 2026: 35 د a month, 120 for six months, 180 a year) and a film stays up for months.
- A sign-up is a name, a phone number and a password («بالنومرو متاعك برك» — no e-mail).
- The counter's code changes by itself and works once («الكود يتبدّل وحدو، ويخدم مرّة برك»).
