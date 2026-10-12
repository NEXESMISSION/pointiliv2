"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { Download, IdCard, Pencil, Plus, QrCode, Trash2, Users, X } from "lucide-react";
import { adminFormDelete, adminFormEntries, adminFormSave, type FormField } from "@/app/actions-forms";

export type IdForm = { id: string; name: string; fields: FormField[]; token: string; active: boolean; n: number };
type Entry = { name: string | null; phone: string | null; data: Record<string, string>; at: string };

const KINDS: { id: FormField["kind"]; label: string }[] = [
  { id: "text", label: "نص" },
  { id: "number", label: "رقم" },
  { id: "phone", label: "تليفون" },
  { id: "date", label: "تاريخ" },
  { id: "choice", label: "اختيار" },
];
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));
const input = "h-9 rounded-[0.625rem] border border-line bg-surface px-2.5 text-[0.8438rem] outline-none focus:border-brand";

/**
 * The founder's forms of identification for one shop: each a name, the fields
 * he chooses (text, number, phone, date, one of a list; required or not) and a
 * QR of its own to hand out where those customers are. Who filled each is one
 * tap away. The owner sees the answers on the counter at every tampon.
 */
export function AdminForms({ shop, forms, origin }: { shop: string; forms: IdForm[]; origin: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<{ id: string | null; name: string; fields: FormField[]; active: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ name: string; url: string; svg: string } | null>(null);
  const [entries, setEntries] = useState<{ form: IdForm; list: Entry[] } | null>(null);
  const [ask, setAsk] = useState<string | null>(null);

  const showQr = async (f: IdForm) => {
    const url = `${origin}/f/${f.token}`;
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } });
    setQr({ name: f.name, url, svg });
  };
  const save = () =>
    start(async () => {
      if (!edit) return;
      const res = await adminFormSave(shop, edit.id, edit.name, edit.fields, edit.active);
      if (!res.ok) return setError(res.error === "name" ? "الاسم لازم من 2 حتى 60 حرف" : res.error === "fields" ? "ثبّت في الخانات: كل وحدة باسمها، والاختيار فيه 2 على الأقل" : "ما تعدّاتش، عاود");
      setError(null);
      setEdit(null);
      router.refresh();
    });
  const nextKey = (fields: FormField[]) => `f${Math.max(0, ...fields.map((f) => Number(f.key.replace(/\D/g, "")) || 0)) + 1}`;
  const setField = (i: number, patch: Partial<FormField>) => setEdit((e) => (e ? { ...e, fields: e.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) } : e));

  return (
    <div className="space-y-3">
      {forms.length === 0 && !edit && <p className="text-[0.8438rem] text-faint">حتى فورم. أعمل فورم (مثلا «طلبة جامعة …») واعطي الـQR متاعو للناس اللي يخصّوه.</p>}

      {forms.map((f) => (
        <div key={f.id} className={`rounded-[0.875rem] border border-line p-3 ${f.active ? "" : "opacity-60"}`}>
          <div className="flex items-center gap-2">
            <IdCard className="size-5 shrink-0 text-brand" />
            <b className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink">{f.name}</b>
            {!f.active && <span className="rounded-full bg-canvas px-2 py-0.5 text-[0.75rem] font-semibold text-muted">موقوف</span>}
            <span className="shrink-0 text-[0.8125rem] text-muted">{f.n} عمّرو</span>
          </div>
          <p className="mt-1 truncate text-[0.8125rem] text-muted">{f.fields.map((x) => x.label + (x.required ? "*" : "")).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void showQr(f)} className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] bg-brand px-2.5 text-[0.8125rem] font-bold text-white">
              <QrCode className="size-4" /> <bdi>QR</bdi>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setEntries({ form: f, list: await adminFormEntries(f.id) }))}
              className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] border border-line bg-surface px-2.5 text-[0.8125rem] font-semibold text-body hover:border-brand"
            >
              <Users className="size-4" /> شكون عمّر
            </button>
            <button type="button" onClick={() => setEdit({ id: f.id, name: f.name, fields: f.fields, active: f.active })} className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] border border-line bg-surface px-2.5 text-[0.8125rem] font-semibold text-body hover:border-brand">
              <Pencil className="size-4" /> بدّل
            </button>
            {ask === f.id ? (
              <button type="button" disabled={pending} onClick={() => start(async () => { await adminFormDelete(shop, f.id); setAsk(null); router.refresh(); })} className="inline-flex h-8 items-center rounded-[0.5rem] bg-coral px-2.5 text-[0.8125rem] font-bold text-white">
                تأكّد: امسحو مع اللي عمّروه
              </button>
            ) : (
              <button type="button" onClick={() => setAsk(f.id)} className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] px-2 text-[0.8125rem] font-semibold text-coral">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {edit ? (
        <div className="space-y-2.5 rounded-[0.875rem] bg-canvas p-3">
          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="اسم الفورم (مثلا: طلبة جامعة صفاقس)" className={`${input} w-full`} />
          {edit.fields.map((f, i) => (
            <div key={f.key} className="space-y-1.5 rounded-[0.625rem] bg-surface p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="الخانة (مثلا: رقم بطاقة الطالب)" className={`${input} min-w-0 flex-1`} />
                <select value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as FormField["kind"] })} className={input}>
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[0.8125rem] font-semibold text-body">
                  <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> لازمة
                </label>
                <button type="button" onClick={() => setEdit({ ...edit, fields: edit.fields.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-full text-muted hover:text-coral" aria-label="X">
                  <X className="size-4" />
                </button>
              </div>
              {f.kind === "choice" && (
                <input
                  value={(f.options ?? []).join("، ")}
                  onChange={(e) => setField(i, { options: e.target.value.split(/[،,]/).map((o) => o.trim()) })}
                  placeholder="الاختيارات، بينهم فاصلة (مثلا: سنة أولى، سنة ثانية)"
                  className={`${input} w-full`}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEdit({ ...edit, fields: [...edit.fields, { key: nextKey(edit.fields), label: "", kind: "text", required: true }] })}
            className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] border border-dashed border-line px-2.5 text-[0.8125rem] font-semibold text-brand"
          >
            <Plus className="size-4" /> زيد خانة
          </button>
          <label className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-body">
            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> الفورم مفتوح (الـQR يخدم)
          </label>
          {error && <p className="text-[0.8125rem] font-semibold text-coral">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={save} className="h-9 flex-1 rounded-[0.625rem] bg-brand text-[0.8438rem] font-bold text-white disabled:opacity-60">
              {pending ? "…" : "سجّل الفورم"}
            </button>
            <button type="button" onClick={() => { setEdit(null); setError(null); }} className="h-9 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold">
              رجوع
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEdit({ id: null, name: "", fields: [{ key: "f1", label: "", kind: "text", required: true }], active: true })}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.625rem] bg-brand text-[0.8438rem] font-bold text-white hover:bg-brand-deep"
        >
          <Plus className="size-4" /> فورم جديد
        </button>
      )}

      {/* the form's QR, to print or send */}
      {qr && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-6" onClick={() => setQr(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-xs rounded-[1.25rem] bg-surface p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[1rem] font-bold">{qr.name}</p>
            <div className="mx-auto mt-3 aspect-square w-56 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr.svg }} />
            <p dir="ltr" className="mt-2 break-all text-[0.75rem] text-muted">
              {qr.url}
            </p>
            <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`} download={`${qr.name}.svg`} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] bg-brand px-3.5 text-[0.8438rem] font-bold text-white">
              <Download className="size-4" /> نزّل <bdi>QR</bdi>
            </a>
          </div>
        </div>
      )}

      {/* who filled a form */}
      {entries && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-6" onClick={() => setEntries(null)} role="dialog" aria-modal="true">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-[1.25rem] bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[1rem] font-bold">
              {entries.form.name} · {entries.list.length} عمّرو
            </p>
            {entries.list.length === 0 ? (
              <p className="mt-3 text-[0.875rem] text-faint">حتى حد مازال</p>
            ) : (
              <table className="mt-3 w-full text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-line text-start text-muted">
                    <th className="py-1.5 text-start font-semibold">شكون</th>
                    {entries.form.fields.map((f) => (
                      <th key={f.key} className="py-1.5 text-start font-semibold">
                        {f.label}
                      </th>
                    ))}
                    <th className="py-1.5 text-start font-semibold">وقتاش</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.list.map((e, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className="py-1.5 font-semibold text-ink">
                        {e.name ?? "—"}
                        {e.phone && (
                          <span dir="ltr" className="block text-[0.75rem] font-normal text-muted">
                            {e.phone}
                          </span>
                        )}
                      </td>
                      {entries.form.fields.map((f) => (
                        <td key={f.key} className="py-1.5 text-body">
                          <bdi>{e.data[f.key] ?? "—"}</bdi>
                        </td>
                      ))}
                      <td className="py-1.5 text-muted">{when(e.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
