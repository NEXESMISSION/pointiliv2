import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Back } from "@/components/Back";
import { Logo } from "@/components/ui";

/** Structured data for search engines and AI assistants, in the page itself. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/**
 * The frame of Pointili's reading pages (the kinds of shop, the questions,
 * the price): the logo and the two ways in at the top, the words in the
 * middle at a comfortable width, and the links to every page at the bottom —
 * so a visitor, a search engine and an AI assistant all find their way.
 */
export function SiteFrame({ support, social, children }: { support: string | null; social?: { facebook: string | null; instagram: string | null; tiktok: string | null }; children: React.ReactNode }) {
  const pages = social ? ([["Facebook", social.facebook], ["Instagram", social.instagram], ["TikTok", social.tiktok]] as const).filter(([, url]) => !!url) : [];
  const wa = support ? `https://wa.me/${support}?text=${encodeURIComponent("سلام، نحب نعرف أكثر على Pointili")}` : null;
  return (
    <div data-read className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Back className="size-10" />
            <Link href="/" aria-label="Pointili">
              <Logo />
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="press hidden h-10 items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-[0.875rem] font-bold text-white sm:flex">
                <MessageCircle className="size-4" /> كلّمنا
              </a>
            )}
            <Link href="/shop/new" className="press flex h-10 items-center rounded-full bg-brand px-4 text-[0.875rem] font-bold text-white shadow-[0_10px_22px_-12px_rgb(108_71_255/0.8)]">
              حلّ محلّك
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-8">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-10">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9062rem] font-semibold">
            <Link href="/" className="text-brand">
              Pointili
            </Link>
            <Link href="/prix" className="text-body hover:text-brand">
              الأسعار
            </Link>
            <Link href="/faq" className="text-body hover:text-brand">
              أسئلة
            </Link>
            <Link href="/guide" className="text-body hover:text-brand">
              كيفاش تختار
            </Link>
            <Link href="/shop/new" className="text-body hover:text-brand">
              حلّ محلّك
            </Link>
            <Link href="/privacy" className="text-muted hover:text-brand">
              الخصوصية
            </Link>
          </div>
          {pages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[0.875rem] font-semibold" dir="ltr">
              {pages.map(([name, url]) => (
                <a key={name} href={url!} target="_blank" rel="noreferrer me" className="text-muted hover:text-brand">
                  {name}
                </a>
              ))}
            </div>
          )}
          <p className="mt-6 text-[0.75rem] text-faint">© Pointili · Tunisie</p>
        </div>
      </footer>
    </div>
  );
}
