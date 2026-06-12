"use client";

import { useState, useTransition } from "react";

import { dismissMatchAction, saveMatchAction } from "@/app/dashboard/actions";

/** Save / dismiss buttons for a match card. Optimistic, server-action backed. */
export function MatchActions({
  tenderId,
  saved,
  canSave = true,
}: {
  tenderId: string;
  saved: boolean;
  canSave?: boolean;
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [pending, startTransition] = useTransition();

  function toggleSave() {
    const next = !isSaved;
    setIsSaved(next); // optimistic
    startTransition(() => saveMatchAction(tenderId, next));
  }

  function dismiss() {
    startTransition(() => dismissMatchAction(tenderId));
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {canSave && (
        <button
          type="button"
          onClick={toggleSave}
          disabled={pending}
          aria-pressed={isSaved}
          className={`rounded-md px-2.5 py-1 transition ${
            isSaved
              ? "bg-brand/10 text-brand"
              : "text-slate-500 hover:bg-slate-100 hover:text-brand"
          } disabled:opacity-50`}
        >
          {isSaved ? "★ محفوظ" : "☆ حفظ"}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        disabled={pending}
        className="rounded-md px-2.5 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 disabled:opacity-50"
      >
        إخفاء
      </button>
    </div>
  );
}
