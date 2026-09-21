import { ns, p } from "../dict";

/** Dates, relative times and the greeting. */
export const formats = ns({
  fr: {
    today: "Aujourd'hui",
    yesterday: "Hier",
    never: "jamais",
    justNow: "à l'instant",
    minutesAgo: "il y a {n} min",
    hoursAgo: "il y a {n} h",
    daysAgo: p({ one: "il y a {n} jour", other: "il y a {n} jours" }),
    inMinutes: p({ one: "dans {n} minute", other: "dans {n} minutes" }),
    daysLeft: p({ one: "{n} jour restant", other: "{n} jours restants" }),
    days: p({ one: "{n} jour", other: "{n} jours" }),
    greetingMorning: "Bonjour",
    greetingAfternoon: "Bon après-midi",
    greetingEvening: "Bonsoir",
    currency: "DT",
    perMonth: "{price} DT / mois",
  },
  tn: {
    today: "اليوم",
    yesterday: "البارح",
    never: "عمرو",
    justNow: "توّا",
    minutesAgo: "قبل {n} دقايق",
    hoursAgo: "قبل {n} سوايع",
    daysAgo: p({ one: "قبل نهار", other: "قبل {n} أيام" }),
    inMinutes: p({ one: "بعد دقيقة", other: "بعد {n} دقايق" }),
    daysLeft: p({ one: "باقي نهار", other: "باقي {n} أيام" }),
    days: p({ one: "نهار", two: "زوز أيام", few: "{n} أيام", many: "{n} يوم", other: "{n} يوم" }),
    greetingMorning: "صباح الخير",
    greetingAfternoon: "نهارك طيّب",
    greetingEvening: "مساء الخير",
    currency: "د.ت",
    perMonth: "{price} د.ت / شهر",
  },
});
