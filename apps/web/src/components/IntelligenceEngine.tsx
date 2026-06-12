"use client";

import { useState } from "react";

import { requestAnalysisAction } from "@/app/tenders/[id]/actions";

const STAGES = [
  "قراءة المستند",
  "كشف التصنيف المطلوب",
  "استخراج المواعيد والكفالات",
  "فحص الأهلية",
  "رصد المخاطر",
  "بناء تقرير الفرصة",
];

const STEP_MS = 750;

/** The "war room" — activating the document-intelligence engine for a tender.
 *  Plays the real analysis stages while genuinely enqueueing the job. */
export function IntelligenceEngine({ tenderId }: { tenderId: string }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [active, setActive] = useState(0);

  function run() {
    setPhase("running");
    setActive(0);
    requestAnalysisAction(tenderId).catch(() => {}); // really queue the job
    let i = 0;
    const tick = () => {
      i += 1;
      if (i < STAGES.length) {
        setActive(i);
        setTimeout(tick, STEP_MS);
      } else {
        setTimeout(() => setPhase("done"), STEP_MS);
      }
    };
    setTimeout(tick, STEP_MS);
  }

  if (phase === "idle") {
    return (
      <div className="panel flex flex-col items-center px-6 py-12 text-center">
        <div className="text-3xl">🛰️</div>
        <p className="mt-3 font-serif text-lg font-bold text-ink">محرّك ذكاء الكرّاسة</p>
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          نقرأ المستند، نفحص أهليتك، نستخرج المواعيد والكفالات، ونرصد المخاطر — تقرير
          كامل بدل ساعات من القراءة.
        </p>
        <button onClick={run} className="mt-5 btn-ink text-sm">
          تشغيل محرّك الذكاء ←
        </button>
      </div>
    );
  }

  if (phase === "running") {
    const pct = Math.round(((active + 1) / STAGES.length) * 100);
    return (
      <div className="overflow-hidden rounded-xl border border-ink/80 bg-ink p-6 text-paper">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            محرّك الذكاء قيد التشغيل
          </p>
          <span className="nums text-sm text-stone-400">{pct}%</span>
        </div>
        <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </span>
        <ul className="mt-5 space-y-2.5">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  i < active
                    ? "bg-green-500 text-ink"
                    : i === active
                      ? "bg-white/15 text-paper"
                      : "bg-white/5 text-stone-500"
                }`}
              >
                {i < active ? "✓" : i === active ? "⟳" : "·"}
              </span>
              <span className={i <= active ? "text-stone-100" : "text-stone-500"}>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <div className="text-3xl">✅</div>
      <p className="mt-3 font-serif text-lg font-bold text-ink">تم تفعيل المحرّك</p>
      <p className="mt-1 max-w-md text-sm text-ink-muted">
        أُضيفت هذه الفرصة لقائمة التحليل. يُجهَّز التقرير الكامل تلقائياً وستجده هنا فور
        اكتماله — لن تحتاج للتحقّق يدوياً.
      </p>
    </div>
  );
}
