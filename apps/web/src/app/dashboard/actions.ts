"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOrgId, setMatchDismissed, setMatchSaved } from "@/lib/repo";

export async function saveMatchAction(tenderId: string, saved: boolean) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await setMatchSaved(orgId, tenderId, saved);
  revalidatePath("/dashboard");
}

export async function dismissMatchAction(tenderId: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await setMatchDismissed(orgId, tenderId);
  revalidatePath("/dashboard");
}
