"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/entitlements";
import {
  getCurrentOrgId,
  getSubscription,
  setMatchDismissed,
  setMatchSaved,
} from "@/lib/repo";

export async function saveMatchAction(tenderId: string, saved: boolean) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  // Saving is a pro+ feature — enforce server-side, not just by hiding the button.
  if (!can(await getSubscription(orgId), "saved")) return;
  await setMatchSaved(orgId, tenderId, saved);
  revalidatePath("/dashboard");
}

export async function dismissMatchAction(tenderId: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await setMatchDismissed(orgId, tenderId);
  revalidatePath("/dashboard");
}
