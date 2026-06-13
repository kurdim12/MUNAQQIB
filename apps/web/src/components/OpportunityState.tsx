"use client";

import { useState, useTransition } from "react";

import { transitionOpportunityAction } from "@/app/tenders/[id]/actions";
import {
  isTerminal,
  nextStates,
  OPP_LABELS,
  type OppStatus,
  statusTone,
} from "@/lib/opportunity";

const TONE: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
  neutral: "bg-sand text-ink-soft border-line",
};

/** Layer 2 — the decision control: current stage + the legal next moves. Drives
 *  the opportunity through its lifecycle; state persists server-side. */
export function OpportunityState({
  tenderId,
  status,
}: {
  tenderId: string;
  status: OppStatus;
}) {
  const [current, setCurrent] = useState<OppStatus>(status);
  const [pending, startTransition] = useTransition();
  const moves = nextStates(current);

  function go(to: OppStatus) {
    setCurrent(to); // optimistic
    startTransition(() => transitionOpportunityAction(tenderId, to));
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="eyebrow">مرحلة الفرصة</h3>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${TONE[statusTone(current)]}`}
        >
          {OPP_LABELS[current]}
        </span>
      </div>

      {isTerminal(current) ? (
        <p className="mt-3 text-sm text-ink-muted">
          أُغلقت هذه الفرصة ({OPP_LABELS[current]}) — لا إجراءات إضافية.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {moves.map((to) => (
            <button
              key={to}
              type="button"
              disabled={pending}
              onClick={() => go(to)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/40 hover:bg-sand/60 disabled:opacity-50"
            >
              {OPP_LABELS[to]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
