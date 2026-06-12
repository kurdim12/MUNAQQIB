"use server";

import { revalidatePath } from "next/cache";

import { getSessionSafe } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { activateSubscription } from "@/lib/repo";

/** Confirm a CliQ payment and activate the org's subscription. Admin-only. */
export async function activateAction(formData: FormData) {
  const session = await getSessionSafe();
  const admin = session?.user;
  if (!admin?.id || !isAdminEmail(admin.email)) {
    throw new Error("غير مصرّح");
  }
  const orgId = String(formData.get("orgId") || "");
  if (!orgId) return;
  await activateSubscription(orgId, admin.id);
  revalidatePath("/admin");
}
