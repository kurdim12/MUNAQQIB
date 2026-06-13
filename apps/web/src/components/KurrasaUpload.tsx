"use client";

import { useRef, useState, useTransition } from "react";

import { uploadKurrasaAction } from "@/app/tenders/[id]/actions";

/** L4 — upload the كرّاسة PDF for AI analysis. Extracts text server-side and
 *  queues the real two-pass analyzer; the brief appears once the worker runs. */
export function KurrasaUpload({ tenderId }: { tenderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await uploadKurrasaAction(tenderId, formData);
      if (!res.ok) setError(res.error ?? "تعذّر الرفع.");
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center">
      <div className="text-2xl">📄</div>
      <h3 className="mt-2 font-serif text-lg font-bold text-ink">
        حلّل كرّاسة العطاء <span className="font-normal text-ink-muted">(وثائق العطاء)</span>
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
        ارفع ملف وثائق العطاء (PDF) ليقرأها محلّلنا ويلخّص لك: هل أنت مؤهّل؟ ما الكفالات
        المطلوبة؟ المواعيد والمخاطر — قبل أن تقضي ساعات في قراءتها.
      </p>

      <form action={onSubmit} className="mt-4 flex flex-col items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
          className="block w-full max-w-sm text-sm text-ink-soft file:me-3 file:rounded-lg file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-line"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-ink text-sm disabled:opacity-50"
        >
          {pending ? "جارٍ الرفع والتحليل…" : "ابدأ التحليل ←"}
        </button>
      </form>

      {name && !error && !pending && (
        <p className="mt-2 text-xs text-ink-muted">{name}</p>
      )}
      {error && (
        <p className="mx-auto mt-3 max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="mt-4 text-[11px] text-ink-muted">
        مراجعة أولية بالذكاء الاصطناعي — راجِع الكرّاسة الأصلية قبل القرار.
      </p>
    </div>
  );
}
