"use server";

import { revalidatePath } from "next/cache";

import type { Tier } from "@/lib/billing";
import { getCurrentOrgId, requestUpgrade } from "@/lib/repo";

/**
 * Start an upgrade: generate a CliQ payment reference and flip the subscription
 * to pending_payment. Payment itself is confirmed manually (CliQ), after which an
 * admin marks the subscription active — see DECISIONS.md.
 */
export async function requestUpgradeAction(formData: FormData) {
  const tier = String(formData.get("tier") || "") as Tier;
  if (!["radar", "pro", "intelligence"].includes(tier)) return;

  const orgId = await getCurrentOrgId();
  if (!orgId) return;

  const reference = `MNQ-${tier.slice(0, 3).toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`;
  await requestUpgrade(orgId, tier, reference);
  revalidatePath("/pricing");
}
