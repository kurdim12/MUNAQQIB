"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { signOutAction } from "@/app/signin/actions";
import {
  getCurrentOrgId,
  updateDigestEmails,
  updateOrgProfile,
} from "@/lib/repo";

export { signOutAction };

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[,\n،]/)
    .map((s) => s.trim())
    .filter(Boolean);

const profileSchema = z.object({
  name: z.string().trim().min(2),
  sector: z.enum(["contracting", "supplies", "consulting", "services"]),
  classification_grade: z.number().int().min(1).max(6).nullable(),
});

export type SettingsResult = { ok: boolean; error?: string };

/** الملف — update the matcher profile; re-match happens on the worker's next run. */
export async function updateProfileAction(formData: FormData): Promise<SettingsResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "الجلسة غير صالحة." };

  const gradeRaw = String(formData.get("classification_grade") ?? "").trim();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    sector: formData.get("sector"),
    classification_grade: gradeRaw ? Number(gradeRaw) : null,
  });
  if (!parsed.success) return { ok: false, error: "تحقّق من الحقول المطلوبة." };

  await updateOrgProfile(orgId, {
    name: parsed.data.name,
    sector: parsed.data.sector,
    classification_grade: parsed.data.classification_grade,
    classification_fields: list(formData.get("classification_fields")),
    supply_categories: list(formData.get("supply_categories")),
    governorates: list(formData.get("governorates")),
    include_keywords: list(formData.get("include_keywords")),
    exclude_keywords: list(formData.get("exclude_keywords")),
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** التوصيل — update digest recipient addresses. */
export async function updateDeliveryAction(formData: FormData): Promise<SettingsResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "الجلسة غير صالحة." };
  const emails = list(formData.get("digest_emails"));
  if (emails.length === 0) return { ok: false, error: "أضِف بريداً واحداً على الأقل." };
  const bad = emails.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (bad) return { ok: false, error: `بريد غير صالح: ${bad}` };
  await updateDigestEmails(orgId, emails);
  revalidatePath("/settings");
  return { ok: true };
}
