"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSessionSafe } from "@/auth";
import { createOrgWithTrial } from "@/lib/repo";

const schema = z.object({
  name: z.string().trim().min(2),
  sector: z.enum(["contracting", "supplies", "consulting", "services"]),
  classification_fields: z.array(z.string().trim().min(1)).default([]),
  classification_grade: z.number().int().min(1).max(6).nullable().default(null),
  governorates: z.array(z.string().trim().min(1)).default([]),
  include_keywords: z.array(z.string().trim().min(1)).default([]),
  exclude_keywords: z.array(z.string().trim().min(1)).default([]),
  digest_emails: z.array(z.string().trim().email()).min(1),
});

export type OnboardingResult = { ok: false; error: string };

/** Create the org + trial, set the org cookie, then redirect to the dashboard. */
export async function createOrgAction(
  input: unknown,
): Promise<OnboardingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  // Link the signed-in user as owner (when auth is configured). When it isn't,
  // ownerUserId is null and onboarding still works on the dev seam.
  const session = await getSessionSafe();

  let orgId: string;
  try {
    orgId = await createOrgWithTrial(parsed.data, session?.user?.id ?? null);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error && err.message.includes("not configured")
          ? "قاعدة البيانات غير مهيّأة في هذه البيئة."
          : "تعذّر إنشاء الحساب، حاول مجدداً.",
    };
  }

  (await cookies()).set("org_id", orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
