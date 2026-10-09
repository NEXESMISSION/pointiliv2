/**
 * The follow-up (the founder's CRM): where each shop stands by his own word,
 * what was said with its owner, and when to come back to it. The words here
 * are the console's (Tunisian, read by the founder alone).
 */

export type Stage = "new" | "tried" | "talked" | "interested" | "promised" | "later" | "refused";
export type Kind = "call" | "whatsapp" | "visit" | "note";
export type Outcome = "answered" | "no_answer" | "busy" | "wrong" | "sent" | "replied";
export type Tone = "grey" | "brand" | "coral" | "mint" | "ink";

/** where a shop stands, in the founder's hand — in the order of a sale */
export const STAGES: { id: Stage; label: string; tone: Tone; hint: string }[] = [
  { id: "new", label: "جديد", tone: "grey", hint: "مازال حد ما كلّمو" },
  { id: "tried", label: "ما جاوبش", tone: "ink", hint: "عيّطنا ولا بعثنا، ما جاوبش" },
  { id: "talked", label: "كلّمناه", tone: "brand", hint: "تكلّمنا معاه" },
  { id: "interested", label: "مهتم", tone: "coral", hint: "يحب يجرّب ولا يشوف" },
  { id: "promised", label: "باش يخلّص", tone: "mint", hint: "قال باش يخلّص" },
  { id: "later", label: "من بعد", tone: "grey", hint: "قال عاودلي من بعد" },
  { id: "refused", label: "ما يحبش", tone: "grey", hint: "ما يحبش، خلاص" },
];
/** a shop whose year is on: past the pipeline, said by the numbers, not by hand */
export const PAID = { label: "خلّص ✓", tone: "mint" as Tone };
export const stageOf = (id: string) => STAGES.find((s) => s.id === id) ?? STAGES[0]!;
/** the order of the list: the ones to work first */
export const STAGE_ORDER: Record<Stage | "paid", number> = { new: 0, tried: 1, talked: 2, interested: 3, promised: 4, later: 5, refused: 6, paid: 7 };

/** what a word with the owner was */
export const KINDS: { id: Kind; label: string }[] = [
  { id: "call", label: "تليفون" },
  { id: "whatsapp", label: "واتساب" },
  { id: "visit", label: "زيارة" },
  { id: "note", label: "نوت" },
];
/** what came of it, by kind (a visit and a note have no outcome) */
export const OUTCOMES: Record<Kind, { id: Outcome; label: string }[]> = {
  call: [
    { id: "answered", label: "جاوب" },
    { id: "no_answer", label: "ما جاوبش" },
    { id: "busy", label: "مشغول" },
    { id: "wrong", label: "نومرو غالط" },
  ],
  whatsapp: [
    { id: "sent", label: "بعثتلو" },
    { id: "replied", label: "جاوب" },
  ],
  visit: [],
  note: [],
};
export const kindOf = (id: string) => KINDS.find((k) => k.id === id)?.label ?? id;
export const outcomeOf = (kind: string, id: string | null) => (id ? (OUTCOMES[kind as Kind] ?? []).find((o) => o.id === id)?.label ?? id : null);
/** «تليفون · جاوب», «زيارة», «نوت» */
export const said = (kind: string, outcome: string | null) => {
  const o = outcomeOf(kind, outcome);
  return o ? `${kindOf(kind)} · ${o}` : kindOf(kind);
};

/** today's date in Tunis, YYYY-MM-DD — the one the next day is measured against */
export const tunisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date());
/** a day shifted by n from today (Tunis), YYYY-MM-DD */
export const dayFromToday = (n: number) => {
  const [y, m, d] = tunisToday().split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** how many days from today a day is (negative: past) */
export const daysFromToday = (day: string) => Math.round((Date.parse(day + "T00:00:00Z") - Date.parse(tunisToday() + "T00:00:00Z")) / 86_400_000);
/** «اليوم», «غدوة», «فات بـ3 أيّام», «بعد 5 أيّام», or the date */
export const daySaid = (day: string) => {
  const n = daysFromToday(day);
  if (n === 0) return "اليوم";
  if (n === 1) return "غدوة";
  if (n === -1) return "فات بنهار";
  if (n < 0) return n >= -10 ? `فات بـ${-n} أيّام` : `فات بـ${-n} يوم`;
  if (n <= 10) return `بعد ${n} أيّام`;
  return `بعد ${n} يوم`;
};
