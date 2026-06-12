"use client";

import { useState } from "react";

import { t } from "@/lib/strings";

/** Add/remove a list of short strings (keywords, fields, governorates). */
export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-brand hover:text-brand"
        >
          {t.onboarding.addItem}
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-sm text-brand"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-brand/60 hover:text-brand"
                aria-label="حذف"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
