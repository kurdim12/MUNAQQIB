"use client";

import { useState, useTransition } from "react";

import { ChipInput } from "@/components/ChipInput";
import type { Sector } from "@/lib/repo";
import { t } from "@/lib/strings";
import { createOrgAction } from "./actions";

const SECTORS: Sector[] = ["contracting", "supplies", "consulting", "services"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sector, setSector] = useState<Sector>("contracting");
  const [fields, setFields] = useState<string[]>([]);
  const [grade, setGrade] = useState<string>("");
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [include, setInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step1Valid = name.trim().length >= 2;
  const canSubmit = step1Valid && /\S+@\S+\.\S+/.test(email.trim());

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createOrgAction({
        name: name.trim(),
        sector,
        classification_fields: fields,
        classification_grade: grade ? Number(grade) : null,
        governorates,
        include_keywords: include,
        exclude_keywords: exclude,
        digest_emails: [email.trim()],
      });
      // A successful action redirects; only an error object returns here.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">{t.onboarding.title}</h1>
      <p className="mt-1 text-slate-600">{t.onboarding.subtitle}</p>

      <div className="mt-2 text-sm text-slate-400">
        <span className="nums">{step}</span> / <span className="nums">2</span>
      </div>

      <div className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        {step === 1 ? (
          <>
            <Field label={t.onboarding.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </Field>

            <Field label={t.onboarding.sector}>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSector(s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      sector === s
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300 text-slate-600 hover:border-brand"
                    }`}
                  >
                    {t.onboarding.sectors[s]}
                  </button>
                ))}
              </div>
            </Field>

            <ChipInput
              label={t.onboarding.classificationFields}
              values={fields}
              onChange={setFields}
              placeholder="أبنية"
            />

            {sector === "contracting" && (
              <Field label={t.onboarding.classificationGrade}>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </Field>
            )}

            <div className="flex justify-start pt-2">
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-40"
              >
                {t.onboarding.next}
              </button>
            </div>
          </>
        ) : (
          <>
            <ChipInput
              label={t.onboarding.governorates}
              values={governorates}
              onChange={setGovernorates}
              placeholder="عمان"
            />
            <ChipInput
              label={t.onboarding.includeKeywords}
              values={include}
              onChange={setInclude}
              placeholder="مدرسة"
            />
            <ChipInput
              label={t.onboarding.excludeKeywords}
              values={exclude}
              onChange={setExclude}
              placeholder="استشارات"
            />
            <Field label={t.onboarding.digestEmail}>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </Field>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-slate-300 px-5 py-2 text-slate-600 hover:border-brand"
              >
                {t.onboarding.back}
              </button>
              <button
                type="button"
                disabled={!canSubmit || pending}
                onClick={submit}
                className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-40"
              >
                {pending ? t.onboarding.creating : t.onboarding.submit}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">{t.onboarding.trialNote}</p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
