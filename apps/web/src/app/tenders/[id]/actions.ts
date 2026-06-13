"use server";

import { revalidatePath } from "next/cache";

import { isOppStatus } from "@/lib/opportunity";
import {
  enqueueAnalysis,
  enqueueAnalysisWithText,
  getCurrentOrgId,
  getOpportunityStatus,
  transitionOpportunity,
} from "@/lib/repo";

/** Queue a document-intelligence job for a tender (Layer 11 producer). */
export async function requestAnalysisAction(tenderId: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await enqueueAnalysis(orgId, tenderId);
  revalidatePath(`/tenders/${tenderId}`);
}

export type UploadResult = { ok: boolean; error?: string };

/** L4 — upload a كرّاسة PDF, extract its text, and queue the real analyzer.
 *  Moves the opportunity into "قيد المراجعة" so the lifecycle reflects the work. */
export async function uploadKurrasaAction(
  tenderId: string,
  formData: FormData,
): Promise<UploadResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "الجلسة غير صالحة." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "اختر ملف الكرّاسة (PDF)." };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "حجم الملف يتجاوز 20MB." };
  }

  let text = "";
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text: pages } = await extractText(pdf, { mergePages: true });
    text = (Array.isArray(pages) ? pages.join("\n") : pages).trim();
  } catch {
    return { ok: false, error: "تعذّرت قراءة ملف PDF. تأكّد أنه ليس صورة ممسوحة." };
  }
  if (text.length < 200) {
    return {
      ok: false,
      error: "لم نستخرج نصاً كافياً — قد تكون الكرّاسة صورة ممسوحة تحتاج OCR.",
    };
  }

  await enqueueAnalysisWithText(orgId, tenderId, text, file.name);
  // Reflect the work in the lifecycle: new → reviewing.
  if ((await getOpportunityStatus(orgId, tenderId)) === "new") {
    await transitionOpportunity(orgId, tenderId, "reviewing");
  }
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Move an opportunity through its lifecycle (Layer 2). The repo enforces the
 *  legal transition; we revalidate every surface that shows the stage. */
export async function transitionOpportunityAction(tenderId: string, to: string) {
  if (!isOppStatus(to)) return;
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await transitionOpportunity(orgId, tenderId, to);
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/watchlist");
}
