/**
 * The drawn pieces the films share, flat and simple (one family with f2's barber): people,
 * a café's front, a cup, a counter. Each returns an SVG or HTML string sized by its container.
 */
const INK = "#2b2838";
export const SKINS = ["#c98b5e", "#e0a87c", "#a86b45", "#f0c29b"];

/** a person standing, front on: shirt, apron or not, a mustache or not, hair */
export function person({ shirt = "#fff", apron = null, skin = SKINS[0], hair = "#1d1a24", mustache = false, legs = INK, shoes = "#15131c", smile = true, hijab = null } = {}) {
  return `<svg viewBox="0 0 200 430" class="art"><ellipse cx="100" cy="418" rx="68" ry="10" fill="#000" opacity=".08"/>
<rect x="72" y="290" width="25" height="120" rx="11" fill="${legs}"/><rect x="103" y="290" width="25" height="120" rx="11" fill="${legs}"/>
<rect x="61" y="399" width="41" height="17" rx="8.5" fill="${shoes}"/><rect x="98" y="399" width="41" height="17" rx="8.5" fill="${shoes}"/>
<path d="M55 186c-13 19-16 51-12 82" stroke="${shirt}" stroke-width="23" stroke-linecap="round" fill="none"/><path d="M145 186c13 19 16 51 12 82" stroke="${shirt}" stroke-width="23" stroke-linecap="round" fill="none"/>
<path d="M53 198c0-33 20-54 47-54s47 21 47 54v96c0 6-4 10-10 10H63c-6 0-10-4-10-10z" fill="${shirt}"/>
${apron ? `<path d="M70 196h60v104c0 5-4 9-9 9H79c-5 0-9-4-9-9z" fill="${apron}"/><rect x="84" y="228" width="32" height="20" rx="5" fill="rgb(255 255 255/.14)"/>` : `<path d="M80 150c4 16 36 16 40 0" stroke="rgb(0 0 0/.15)" stroke-width="5" fill="none" stroke-linecap="round"/>`}
<circle cx="43" cy="272" r="11" fill="${skin}"/><circle cx="157" cy="272" r="11" fill="${skin}"/>
<rect x="91" y="127" width="18" height="22" fill="${skin}" opacity=".85"/><circle cx="100" cy="95" r="39" fill="${skin}"/>
${hijab ? `<path d="M56 100c0-34 18-54 44-54s44 20 44 54v30c-10 16-26 24-44 24s-34-8-44-24z" fill="${hijab}"/><circle cx="100" cy="100" r="31" fill="${skin}"/>` : `<path d="M61 93c0-29 16-46 39-46s39 17 39 46c-7-13-20-21-39-21s-32 8-39 21z" fill="${hair}"/>`}
<circle cx="87" cy="98" r="4.4" fill="#1d1a24"/><circle cx="113" cy="98" r="4.4" fill="#1d1a24"/>
${mustache ? `<path d="M83 115c10-7 24-7 34 0-11 6-23 6-34 0z" fill="${hair}"/>` : ""}
${smile ? `<path d="M90 ${mustache ? 125 : 114}c6 5 14 5 20 0" stroke="#7a4a2c" stroke-width="3.2" fill="none" stroke-linecap="round"/>` : `<path d="M90 ${mustache ? 128 : 117}c6-4 14-4 20 0" stroke="#7a4a2c" stroke-width="3.2" fill="none" stroke-linecap="round"/>`}</svg>`;
}

/** a cup of coffee, a saucer under it; steam when `hot` */
export const cup = (hot = true) => `<svg viewBox="0 0 200 170" class="art">${hot ? `<path d="M84 34c-10-12 10-18 0-30M104 34c-10-12 10-18 0-30M124 34c-10-12 10-18 0-30" stroke="#cbbfb3" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>` : ""}
<ellipse cx="100" cy="150" rx="92" ry="18" fill="#efe9f9"/><ellipse cx="100" cy="146" rx="68" ry="11" fill="#e1d9f3"/>
<path d="M44 56h112l-11 64a18 18 0 0 1-18 15H73a18 18 0 0 1-18-15z" fill="#fff" stroke="#e1d9f3" stroke-width="3"/>
<path d="M155 70c26-5 30 30 2 35" stroke="#fff" stroke-width="11" fill="none"/><path d="M155 70c26-5 30 30 2 35" stroke="#e1d9f3" stroke-width="3" fill="none"/>
<ellipse cx="100" cy="57" rx="56" ry="12" fill="#6b3f22"/><ellipse cx="96" cy="55" rx="32" ry="6" fill="#a8703f"/></svg>`;

/** a café's front: awning in its colour, its name on a sign, a window, a door */
export const front = ({ id = "", x = 0, top = 430, w = 400, name = "", awning = "#6c47ff", lit = true } = {}) =>
  `<div class="front" id="${id}" style="left:${x}px;top:${top}px;width:${w}px">
    <div class="awn" style="background:repeating-linear-gradient(90deg,${awning} 0 48px,#fff 48px 96px)"></div>
    <div class="sign">${name}</div>
    <div class="win ${lit ? "lit" : ""}"><i></i><i></i></div><div class="door"></div></div>`;

/** the CSS the pieces above need */
export const ART_CSS = `
.art{position:absolute;display:block;overflow:visible}
.front{position:absolute;height:520px;background:#fff;border-radius:22px 22px 0 0;box-shadow:0 26px 50px -30px rgb(40 20 90/.45)}
.front .sign{position:absolute;top:-34px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--ink);color:#fff;font-weight:700;font-size:38px;padding:12px 30px 18px;border-radius:999px}
.front .awn{position:absolute;top:56px;left:-14px;right:-14px;height:96px;border-radius:14px 14px 0 0;-webkit-mask:radial-gradient(circle at 24px 96px,#0000 22px,#000 23px) -24px 0/48px 100%,linear-gradient(#000,#000) 0 0/100% 74px no-repeat}
.front .win{position:absolute;top:190px;left:30px;width:200px;height:200px;border-radius:16px;background:linear-gradient(160deg,#e9e6f2,#d6d2e4);overflow:hidden}
.front .win.lit{background:linear-gradient(160deg,#fff4d6,#ffd98a)}
.front .win i{position:absolute;bottom:0;width:56px;height:70px;border-radius:28px 28px 0 0;background:rgb(43 40 56/.16)}
.front .win i:first-child{left:26px}.front .win i:last-child{left:110px}
.front .win:not(.lit) i{display:none}
.front .door{position:absolute;bottom:0;right:36px;width:120px;height:250px;border-radius:60px 60px 0 0;background:#d8d2ec}
.front .door:after{content:"";position:absolute;top:120px;left:20px;width:14px;height:14px;border-radius:50%;background:#8f8ba3}
.street{position:absolute;left:30px;right:30px;height:14px;border-radius:7px;background:#ddd6f1}
.bubble{position:absolute;background:#fff;border-radius:34px;padding:22px 34px 28px;font-weight:700;font-size:46px;box-shadow:0 18px 36px -18px rgb(40 20 90/.45);white-space:nowrap}
.bubble:after{content:"";position:absolute;bottom:-22px;width:0;height:0;border:16px solid transparent;border-top:22px solid #fff}
.bubble.l:after{left:40px}.bubble.r:after{right:40px}
`;
