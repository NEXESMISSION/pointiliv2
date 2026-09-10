/**
 * Tunisian strings for the SCAFFOLD's own surfaces: the install bar, the error
 * screens, the landing, the switchboard, the language toggle. French is the
 * key. Owned by the scaffold; every other owner has their own fragment.
 *
 * THE TRAP: a key here that another fragment also defines is silently
 * overridden by the later spread (see lib/dict.ts order). Keep these to the
 * scaffold's screens.
 */
export const baseDict: Record<string, string> = {
  /* ── install bar (components/InstallPrompt) ── */
  "Ajouter à l'écran d'accueil": "زيدها في الشاشة الرئيسية",
  "« {what} » — sans store, sans installation": "« {what} » — بلا store، بلا installation",
  "Ma carte": "الكارت متاعي",
  "Mon écran": "الشاشة متاعي",
  "Ajouter": "زيد",
  "Comment ?": "كيفاش؟",
  "Masquer": "خبّي",
  "Sur iPhone, c'est Safari qui installe — en trois gestes.": "على iPhone، Safari هو اللي يركّب — بثلاث حركات.",
  "Touche le bouton Partager": "اضغط على زر Partager",
  "en bas de Safari — le carré avec une flèche vers le haut.": "لوطا في Safari — المربّع اللي فيه سهم للفوق.",
  "Fais défiler et choisis « Sur l'écran d'accueil »": "نزّل و اختار « Sur l'écran d'accueil »",
  "dans la liste des options.": "في قائمة الخيارات.",
  "Touche « Ajouter »": "اضغط « Ajouter »",
  "en haut à droite. L'icône Pointili apparaît avec tes autres apps.": "فوق على اليمين. أيقونة Pointili تظهر مع بقية الـ apps متاعك.",
  "Si tu ne vois pas « Sur l'écran d'accueil », ouvre cette page dans Safari : Chrome et les autres navigateurs iOS ne peuvent pas installer.":
    "كان ما تلقاش « Sur l'écran d'accueil »، حلّ الصفحة هذي في Safari : Chrome و بقية الـ navigateurs متاع iOS ما ينجّموش يركّبوا.",
  "C'est fait": "تمّ",

  /* ── error boundary (app/error.tsx) ── */
  "Ça n'a pas chargé": "ما تحمّلتش",
  "Quelque chose n'a pas répondu. Réessaie dans un instant.": "حاجة ما جاوبتش. عاود بعد شويّة.",
  "Tes tampons sont en sécurité — rien n'est perdu.": "الطوابع متاعك في الأمان — حتى شيء ما ضاع.",
  "Réessayer": "عاود",
  "Mes cartes": "الكوارط متاعي",

  /* ── landing (app/page.tsx) ── */
  "Scanne l'écran, c'est tamponné.": "سكاني الشاشة، و الطابع تحطّ.",
  "Une carte à tampons sans application : le commerce affiche un QR, tu le scannes avec ton appareil photo, le tampon se pose.":
    "كارت طوابع بلا application : المحلّ يعرض QR، تسكانيه بالكاميرا متاعك، و الطابع يتحطّ.",
  "Voir mes cartes": "شوف الكوارط متاعي",
  "Je tiens un commerce": "عندي محلّ",
  "En savoir plus sur Pointili": "اعرف أكثر على Pointili",
};
