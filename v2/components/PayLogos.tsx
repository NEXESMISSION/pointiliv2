/**
 * The marks of the ways to pay, drawn here (no picture to fetch): the card
 * networks, D17, the bank, the post office. Each sits on a white tile of the
 * same size so the list reads as one column.
 */

export function VisaMark({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 24" className={className} role="img" aria-label="Visa">
      <text x="36" y="20" textAnchor="middle" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="22" fontStyle="italic" fontWeight="900" letterSpacing="-0.5" fill="#1A1F71">
        VISA
      </text>
    </svg>
  );
}

export function MastercardMark({ className = "h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} role="img" aria-label="Mastercard">
      <circle cx="15" cy="12" r="10" fill="#EB001B" />
      <circle cx="25" cy="12" r="10" fill="#F79E1B" />
      <path d="M20 3.34a10 10 0 0 1 0 17.32 10 10 0 0 1 0-17.32z" fill="#FF5F00" />
    </svg>
  );
}

export function D17Mark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="D17">
      <defs>
        <linearGradient id="d17g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E5BB8" />
          <stop offset="1" stopColor="#0B2F6B" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#d17g)" />
      <text x="24" y="30" textAnchor="middle" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="17" fontWeight="900" fill="#fff">
        D17
      </text>
      <rect x="14" y="35" width="20" height="3" rx="1.5" fill="#FFC72C" />
    </svg>
  );
}

export function BankMark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Virement">
      <rect width="48" height="48" rx="12" fill="#E9F3EF" />
      <path d="M24 10 9 17.5V20h30v-2.5L24 10z" fill="#0F7A55" />
      <rect x="12" y="22" width="4" height="12" rx="1" fill="#0F7A55" />
      <rect x="22" y="22" width="4" height="12" rx="1" fill="#0F7A55" />
      <rect x="32" y="22" width="4" height="12" rx="1" fill="#0F7A55" />
      <rect x="9" y="35" width="30" height="3.5" rx="1.2" fill="#0F7A55" />
      <path d="M33 8.5h7m0 0-2.5-2.5M40 8.5 37.5 11" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function CashMark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Versement">
      <rect width="48" height="48" rx="12" fill="#FFF4E5" />
      <rect x="8" y="15" width="32" height="19" rx="3" fill="#F59E0B" />
      <rect x="11" y="18" width="26" height="13" rx="2" fill="#FCD34D" />
      <circle cx="24" cy="24.5" r="4.2" fill="#F59E0B" />
      <circle cx="15" cy="24.5" r="1.4" fill="#F59E0B" />
      <circle cx="33" cy="24.5" r="1.4" fill="#F59E0B" />
      <path d="M17 39h14" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function PostMark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Mandat">
      <rect width="48" height="48" rx="12" fill="#FFD200" />
      <rect x="9" y="14" width="30" height="21" rx="3" fill="#003F87" />
      <path d="m10 16 14 10 14-10" stroke="#FFD200" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function CardMark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Card">
      <rect width="48" height="48" rx="12" fill="#EEF0FF" />
      <rect x="8" y="13" width="32" height="22" rx="4" fill="#1A1F71" />
      <rect x="8" y="18" width="32" height="4" fill="#4C5BD4" />
      <rect x="12" y="27" width="9" height="3" rx="1.5" fill="#fff" opacity="0.85" />
      <circle cx="31" cy="29" r="3" fill="#EB001B" />
      <circle cx="35" cy="29" r="3" fill="#F79E1B" opacity="0.95" />
    </svg>
  );
}

/** «Dodo Payments», small: who runs the card page. */
export function DodoMark({ className = "h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 20" className={className} role="img" aria-label="Dodo Payments">
      <circle cx="9" cy="10" r="8" fill="#0F0E17" />
      <circle cx="11.5" cy="7.5" r="1.6" fill="#fff" />
      <path d="M15.5 9.5 19 11l-3.6.9z" fill="#F59E0B" />
      <text x="24" y="14.5" fontFamily="Arial, Helvetica, sans-serif" fontSize="12.5" fontWeight="700" fill="#0F0E17">
        Dodo Payments
      </text>
    </svg>
  );
}
