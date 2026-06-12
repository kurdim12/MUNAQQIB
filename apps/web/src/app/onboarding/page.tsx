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
  const input =
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";

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
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <section className="mx-auto max-w-xl animate-fade-in">
      <p className="eyebrow">إعداد ملف المنشأة</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-ink">{t.onboarding.title}</h1>
      <p className="mt-1.5 text-ink-soft">{t.onboarding.subtitle}</p>

      <div className="mt-2 text-sm text-ink-muted">
        الخطوة <span className="nums">{step}</span> من <span className="nums">2</span>
      </div>

      <div className="panel mt-6 space-y-5 p-6">
        {step === 1 ? (
          <>
            <Field label={t.onboarding.name}>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
            </Field>

            <Field label={t.onboarding.sector}>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSector(s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      sector === s
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-ink-soft hover:border-ink/40"
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
                  className={`${input} w-24`}
                />
              </Field>
            )}

            <div className="flex justify-start pt-2">
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="btn-ink disabled:opacity-40"
              >
                {t.onboarding.next}
              </button>
            </div>
          </>
        ) : (
          <>
            <ChipInput label={t.onboarding.governorates} values={governorates} onChange={setGovernorates} placeholder="عمان" />
            <ChipInput label={t.onboarding.includeKeywords} values={include} onChange={setInclude} placeholder="مدرسة" />
            <ChipInput label={t.onboarding.excludeKeywords} values={exclude} onChange={setExclude} placeholder="استشارات" />
            <Field label={t.onboarding.digestEmail}>
              <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </Field>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(1)} className="btn-outline">
                {t.onboarding.back}
              </button>
              <button
                type="button"
                disabled={!canSubmit || pending}
                onClick={submit}
                className="btn-ink disabled:opacity-40"
              >
                {pending ? t.onboarding.creating : t.onboarding.submit}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-ink-muted">{t.onboarding.trialNote}</p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
