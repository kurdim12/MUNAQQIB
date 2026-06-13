"use client";

import { useState, useTransition } from "react";

import type { SettingsResult } from "@/app/settings/actions";

/** Wraps a settings form: runs the server action, shows a save/error toast. */
export function SettingsForm({
  action,
  submitLabel,
  successText,
  children,
}: {
  action: (fd: FormData) => Promise<SettingsResult>;
  submitLabel: string;
  successText: string;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<SettingsResult | null>(null);

  function onSubmit(fd: FormData) {
    setMsg(null);
    start(async () => setMsg(await action(fd)));
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {children}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="btn-primary text-sm disabled:opacity-50">
          {pending ? "جارٍ الحفظ…" : submitLabel}
        </button>
        {msg && (
          <span className={`text-sm font-medium ${msg.ok ? "text-primary-700" : "text-red-700"}`}>
            {msg.ok ? successText : msg.error}
          </span>
        )}
      </div>
    </form>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
